# CannaConverter SaaS - Authentication & Authorization System
# JWT-based authentication with role-based access control

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, OAuth2PasswordBearer
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta
from typing import Optional, List
import secrets
import hashlib
import os

from .models import User, ApiKey, PlanType
from .database import get_db
from sqlalchemy.orm import Session

# =============================================================================
# CONFIGURATION
# =============================================================================

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days
REFRESH_TOKEN_EXPIRE_DAYS = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/auth/token",
    scopes={
        "read": "Read access to user data",
        "write": "Write access to user data", 
        "convert": "Access to conversion API",
        "admin": "Administrative access"
    }
)

# API Key security
api_key_security = HTTPBearer()

# =============================================================================
# PASSWORD UTILITIES
# =============================================================================

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Generate password hash."""
    return pwd_context.hash(password)

def generate_api_key() -> tuple[str, str]:
    """Generate API key ID and secret."""
    key_id = f"ck_{secrets.token_urlsafe(16)}"
    secret = secrets.token_urlsafe(32)
    return key_id, secret

def hash_api_key(secret: str) -> str:
    """Hash API key secret for storage."""
    return hashlib.sha256(secret.encode()).hexdigest()

# =============================================================================
# JWT TOKEN UTILITIES
# =============================================================================

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict) -> str:
    """Create JWT refresh token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str, token_type: str = "access") -> dict:
    """Verify and decode JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Verify token type
        if payload.get("type") != token_type:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )
        
        # Check expiration
        exp = payload.get("exp")
        if exp is None or datetime.utcnow() > datetime.fromtimestamp(exp):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
            
        return payload
        
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )

# =============================================================================
# USER AUTHENTICATION
# =============================================================================

def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """Authenticate user with email and password."""
    user = db.query(User).filter(User.email == email).first()
    
    if not user or not verify_password(password, user.hashed_password):
        return None
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled"
        )
        
    return user

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """Get current user from JWT token."""
    payload = verify_token(token)
    user_id = payload.get("sub")
    
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
        
    return user

def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Ensure current user is active."""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled"
        )
    return current_user

# =============================================================================
# API KEY AUTHENTICATION
# =============================================================================

def authenticate_api_key(
    credentials: HTTPAuthorizationCredentials = Depends(api_key_security),
    db: Session = Depends(get_db)
) -> User:
    """Authenticate request using API key."""
    
    # Extract key from Authorization: Bearer header
    api_key_value = credentials.credentials
    
    # Parse key format: ck_<key_id>_<secret>
    try:
        parts = api_key_value.split('_')
        if len(parts) != 3 or parts[0] != 'ck':
            raise ValueError("Invalid key format")
            
        key_id = f"{parts[0]}_{parts[1]}"
        secret = parts[2]
        
    except (ValueError, IndexError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key format"
        )
    
    # Find API key in database
    api_key = db.query(ApiKey).filter(
        ApiKey.key_id == key_id,
        ApiKey.is_active == True
    ).first()
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )
    
    # Verify secret hash
    secret_hash = hash_api_key(secret)
    if api_key.key_hash != secret_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )
    
    # Check expiration
    if api_key.expires_at and api_key.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key has expired"
        )
    
    # Get associated user
    user = db.query(User).filter(User.id == api_key.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Associated user account is disabled"
        )
    
    # Update usage statistics
    api_key.last_used_at = datetime.utcnow()
    api_key.usage_count += 1
    db.commit()
    
    return user

# =============================================================================
# AUTHORIZATION & PERMISSIONS
# =============================================================================

def require_plan(required_plans: List[PlanType]):
    """Decorator to require specific subscription plans."""
    def plan_checker(current_user: User = Depends(get_current_active_user)) -> User:
        if current_user.plan not in required_plans:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This feature requires a {' or '.join([p.value for p in required_plans])} plan"
            )
        return current_user
    return plan_checker

def require_credits(min_credits: int = 1):
    """Decorator to require minimum credits."""
    def credits_checker(current_user: User = Depends(get_current_active_user)) -> User:
        if current_user.credits_remaining < min_credits:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="Insufficient credits. Please upgrade your plan or purchase additional credits."
            )
        return current_user
    return credits_checker

def require_verified_user(current_user: User = Depends(get_current_active_user)) -> User:
    """Require verified email address."""
    if not current_user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email address to use this feature"
        )
    return current_user

def check_file_size_limit(file_size_bytes: int, current_user: User = Depends(get_current_active_user)):
    """Check if file size is within user's plan limits."""
    max_size_bytes = current_user.max_file_size_mb * 1024 * 1024
    
    if file_size_bytes > max_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size ({file_size_bytes / 1024 / 1024:.1f} MB) exceeds your plan limit of {current_user.max_file_size_mb} MB"
        )

def check_monthly_quota(current_user: User = Depends(get_current_active_user)):
    """Check if user has remaining monthly quota."""
    # Implementation would check current month usage against quota
    # This is a simplified version
    if current_user.credits_remaining <= 0:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Monthly quota exceeded. Please upgrade your plan or wait for next billing cycle."
        )

# =============================================================================
# ADMIN UTILITIES
# =============================================================================

def require_admin(current_user: User = Depends(get_current_active_user)) -> User:
    """Require admin privileges."""
    # This would check for admin role in a real implementation
    # For now, we'll use a simple check
    if not current_user.email.endswith('@cannaconverter.com'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required"
        )
    return current_user

# =============================================================================
# RATE LIMITING
# =============================================================================

from fastapi import Request
from typing import Dict
import time

# Simple in-memory rate limiter (use Redis in production)
rate_limit_storage: Dict[str, Dict] = {}

def check_rate_limit(
    request: Request,
    current_user: User = Depends(get_current_active_user),
    requests_per_minute: Optional[int] = None
) -> User:
    """Check API rate limits."""
    
    # Use user's plan rate limit if not specified
    if requests_per_minute is None:
        requests_per_minute = current_user.api_rate_limit
    
    # Skip rate limiting for unlimited plans
    if requests_per_minute <= 0:
        return current_user
    
    user_id = str(current_user.id)
    current_time = time.time()
    minute_window = int(current_time // 60)
    
    # Initialize or get user's rate limit data
    if user_id not in rate_limit_storage:
        rate_limit_storage[user_id] = {}
    
    user_limits = rate_limit_storage[user_id]
    
    # Clean old windows
    old_windows = [k for k in user_limits.keys() if k < minute_window - 1]
    for old_window in old_windows:
        del user_limits[old_window]
    
    # Check current window
    current_requests = user_limits.get(minute_window, 0)
    
    if current_requests >= requests_per_minute:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please try again later.",
            headers={"Retry-After": "60"}
        )
    
    # Increment counter
    user_limits[minute_window] = current_requests + 1
    
    return current_user

# =============================================================================
# SECURITY UTILITIES
# =============================================================================

def generate_verification_token() -> str:
    """Generate email verification token."""
    return secrets.token_urlsafe(32)

def generate_password_reset_token() -> str:
    """Generate password reset token."""
    return secrets.token_urlsafe(32)

def validate_password_strength(password: str) -> bool:
    """Validate password meets security requirements."""
    if len(password) < 8:
        return False
    
    has_upper = any(c.isupper() for c in password)
    has_lower = any(c.islower() for c in password)
    has_digit = any(c.isdigit() for c in password)
    has_special = any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password)
    
    return has_upper and has_lower and has_digit and has_special

# =============================================================================
# SESSION MANAGEMENT
# =============================================================================

def create_user_session(user: User) -> dict:
    """Create user session data."""
    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "plan": user.plan.value,
            "scopes": ["read", "write", "convert"]
        }
    )
    
    refresh_token = create_refresh_token(
        data={"sub": str(user.id)}
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "plan": user.plan.value,
            "credits_remaining": user.credits_remaining,
            "is_verified": user.is_verified
        }
    }

def refresh_user_session(refresh_token: str, db: Session) -> dict:
    """Refresh user session using refresh token."""
    payload = verify_token(refresh_token, "refresh")
    user_id = payload.get("sub")
    
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    return create_user_session(user)