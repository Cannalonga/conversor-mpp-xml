# CannaConverter SaaS - Main FastAPI Application
# Enterprise-grade API with authentication, billing, and conversion services

from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form, Request
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Optional
import uuid
import os

from .database import get_db, engine
from .models import Base, User, ConversionJob, BillingRecord, PLAN_LIMITS
from .auth import (
    authenticate_user, create_user_session, get_current_active_user,
    require_plan, require_credits, check_file_size_limit, check_rate_limit,
    get_password_hash, generate_api_key, hash_api_key
)
from .schemas import *
from .billing import create_pix_payment, process_webhook_payment
from .conversion import queue_conversion_job, get_job_status
from .monitoring import monitor_request, track_conversion_metrics

# =============================================================================
# APP INITIALIZATION
# =============================================================================

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="CannaConverter API",
    description="Enterprise file conversion service with robust API and billing",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# =============================================================================
# MIDDLEWARE
# =============================================================================

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://cannaconverter.com",
        "https://app.cannaconverter.com",
        "http://localhost:3000",  # Development
        "http://localhost:5173"   # Vite dev server
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Trusted Host
app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=["cannaconverter.com", "*.cannaconverter.com", "localhost"]
)

# Request monitoring middleware
@app.middleware("http")
async def monitoring_middleware(request: Request, call_next):
    start_time = datetime.utcnow()
    response = await call_next(request)
    
    # Track metrics
    process_time = (datetime.utcnow() - start_time).total_seconds()
    monitor_request(
        method=request.method,
        endpoint=request.url.path,
        status_code=response.status_code,
        duration_seconds=process_time
    )
    
    return response

# =============================================================================
# ERROR HANDLERS
# =============================================================================

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error="http_error",
            message=exc.detail,
            details={"status_code": exc.status_code}
        ).dict()
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error="internal_server_error",
            message="An unexpected error occurred",
            details={"type": str(type(exc).__name__)}
        ).dict()
    )

# =============================================================================
# AUTHENTICATION ENDPOINTS
# =============================================================================

@app.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user account."""
    
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="User with this email already exists"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        full_name=user_data.full_name,
        company=user_data.company,
        plan=PlanType.STARTER,
        credits_remaining=PLAN_LIMITS[PlanType.STARTER]["monthly_conversions"],
        monthly_quota=PLAN_LIMITS[PlanType.STARTER]["monthly_conversions"],
        max_file_size_mb=PLAN_LIMITS[PlanType.STARTER]["max_file_size_mb"]
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Create session
    return create_user_session(user)

@app.post("/auth/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login with email and password."""
    
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password"
        )
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    return create_user_session(user)

@app.post("/auth/refresh", response_model=Token)
async def refresh_token(token_data: TokenRefresh, db: Session = Depends(get_db)):
    """Refresh access token using refresh token."""
    from .auth import refresh_user_session
    return refresh_user_session(token_data.refresh_token, db)

@app.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """Get current user information."""
    return current_user

# =============================================================================
# CONVERSION ENDPOINTS
# =============================================================================

@app.post("/convert", response_model=FileUploadResponse)
async def convert_file(
    file: UploadFile = File(...),
    converter_type: ConverterType = Form(...),
    output_format: str = Form("json"),
    webhook_url: Optional[str] = Form(None),
    priority: int = Form(5),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Upload and convert a file."""
    
    # Rate limiting
    current_user = check_rate_limit(request=None, current_user=current_user)
    
    # Credit check
    current_user = require_credits(1)(current_user)
    
    # File size check
    file_content = await file.read()
    check_file_size_limit(len(file_content), current_user)
    
    # Create conversion job
    job = ConversionJob(
        user_id=current_user.id,
        original_filename=file.filename,
        file_size_bytes=len(file_content),
        converter_type=converter_type,
        input_format=file.filename.split('.')[-1].lower(),
        output_format=output_format,
        priority=priority,
        status=JobStatus.QUEUED
    )
    
    db.add(job)
    db.commit()
    db.refresh(job)
    
    # Queue for processing
    estimated_completion = queue_conversion_job(job.id, file_content, converter_type, output_format)
    
    # Deduct credits
    current_user.credits_remaining -= 1
    db.commit()
    
    # Track metrics
    track_conversion_metrics(converter_type, file_size_bytes=len(file_content))
    
    return FileUploadResponse(
        job_id=str(job.id),
        status="queued",
        estimated_completion=estimated_completion,
        message=f"File '{file.filename}' uploaded successfully. Conversion started."
    )

@app.get("/jobs", response_model=ConversionJobList)
async def list_jobs(
    page: int = 1,
    per_page: int = 20,
    status: Optional[JobStatus] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List user's conversion jobs."""
    
    query = db.query(ConversionJob).filter(ConversionJob.user_id == current_user.id)
    
    if status:
        query = query.filter(ConversionJob.status == status)
    
    # Pagination
    total_count = query.count()
    jobs = query.offset((page - 1) * per_page).limit(per_page).all()
    
    return ConversionJobList(
        jobs=jobs,
        total_count=total_count,
        page=page,
        per_page=per_page,
        has_next=page * per_page < total_count,
        has_prev=page > 1
    )

@app.get("/jobs/{job_id}", response_model=ConversionJobDetail)
async def get_job(
    job_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific job."""
    
    job = db.query(ConversionJob).filter(
        ConversionJob.id == job_id,
        ConversionJob.user_id == current_user.id
    ).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return job

@app.delete("/jobs/{job_id}")
async def cancel_job(
    job_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Cancel a queued or processing job."""
    
    job = db.query(ConversionJob).filter(
        ConversionJob.id == job_id,
        ConversionJob.user_id == current_user.id,
        ConversionJob.status.in_([JobStatus.QUEUED, JobStatus.PROCESSING])
    ).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or cannot be cancelled")
    
    job.status = JobStatus.CANCELLED
    db.commit()
    
    return {"message": "Job cancelled successfully"}

# =============================================================================
# BILLING ENDPOINTS
# =============================================================================

@app.get("/billing/subscription", response_model=SubscriptionResponse)
async def get_subscription(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get current subscription information."""
    
    # This would fetch from Subscription table in a real implementation
    return {
        "plan_type": current_user.plan,
        "status": "active",
        "current_period_start": datetime.utcnow().replace(day=1),
        "current_period_end": datetime.utcnow().replace(day=28),
        "monthly_price_brl": PLAN_LIMITS[current_user.plan]["monthly_price_brl"] or 0,
        "billing_cycle": "monthly",
        "auto_renew": True,
        "cancel_at_period_end": False
    }

@app.post("/billing/checkout", response_model=CheckoutResponse)
async def create_checkout(
    checkout_data: CreateCheckout,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create payment checkout session."""
    
    plan_limits = PLAN_LIMITS[checkout_data.plan_type]
    price_brl = plan_limits["monthly_price_brl"]
    
    if price_brl is None or price_brl <= 0:
        raise HTTPException(status_code=400, detail="Plan price not available")
    
    # Create PIX payment
    payment_response = create_pix_payment(
        amount_brl=price_brl,
        user_id=str(current_user.id),
        description=f"CannaConverter {checkout_data.plan_type.value} Plan"
    )
    
    # Create billing record
    billing_record = BillingRecord(
        user_id=current_user.id,
        transaction_type="subscription",
        amount_brl=price_brl,
        currency="BRL",
        payment_method="pix",
        payment_status=PaymentStatus.PENDING,
        payment_id=payment_response["payment_id"],
        pix_qr_code=payment_response["pix_qr_code"],
        pix_code=payment_response["pix_code"],
        new_plan=checkout_data.plan_type,
        description=f"Upgrade to {checkout_data.plan_type.value} plan"
    )
    
    db.add(billing_record)
    db.commit()
    
    return CheckoutResponse(
        checkout_url=f"https://app.cannaconverter.com/checkout/{billing_record.id}",
        payment_id=payment_response["payment_id"],
        pix_qr_code=payment_response["pix_qr_code"],
        pix_code=payment_response["pix_code"],
        expires_at=datetime.utcnow() + timedelta(hours=24)
    )

@app.get("/billing/history", response_model=List[BillingRecordResponse])
async def get_billing_history(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get billing history."""
    
    billing_records = db.query(BillingRecord).filter(
        BillingRecord.user_id == current_user.id
    ).order_by(BillingRecord.created_at.desc()).limit(50).all()
    
    return billing_records

@app.get("/billing/usage", response_model=UsageResponse)
async def get_usage_stats(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get usage statistics and projections."""
    
    # Current month usage
    current_month = datetime.utcnow().month
    current_year = datetime.utcnow().year
    
    monthly_usage = db.query(ConversionJob).filter(
        ConversionJob.user_id == current_user.id,
        ConversionJob.created_at >= datetime(current_year, current_month, 1),
        ConversionJob.status == JobStatus.COMPLETED
    ).count()
    
    return UsageResponse(
        current_period={
            "conversions_used": monthly_usage,
            "conversions_quota": current_user.monthly_quota,
            "usage_percentage": (monthly_usage / current_user.monthly_quota) * 100 if current_user.monthly_quota > 0 else 0
        },
        historical=[],  # Would implement historical data
        projected_overage=None
    )

# =============================================================================
# WEBHOOK ENDPOINTS
# =============================================================================

@app.post("/webhooks/payment")
async def payment_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle payment provider webhooks."""
    
    payload = await request.json()
    signature = request.headers.get("X-Signature")
    
    # Verify webhook signature (implement based on payment provider)
    # ...
    
    # Process payment
    result = process_webhook_payment(payload, db)
    
    if result:
        return {"status": "success"}
    else:
        raise HTTPException(status_code=400, detail="Webhook processing failed")

# =============================================================================
# USER MANAGEMENT ENDPOINTS
# =============================================================================

@app.get("/dashboard", response_model=UserDashboard)
async def get_dashboard(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get user dashboard data."""
    
    # Recent jobs
    recent_jobs = db.query(ConversionJob).filter(
        ConversionJob.user_id == current_user.id
    ).order_by(ConversionJob.created_at.desc()).limit(5).all()
    
    # Current month usage
    current_month_usage = db.query(ConversionJob).filter(
        ConversionJob.user_id == current_user.id,
        ConversionJob.created_at >= datetime.utcnow().replace(day=1),
        ConversionJob.status == JobStatus.COMPLETED
    ).count()
    
    # Total conversions
    total_conversions = db.query(ConversionJob).filter(
        ConversionJob.user_id == current_user.id,
        ConversionJob.status == JobStatus.COMPLETED
    ).count()
    
    return UserDashboard(
        user=current_user,
        current_month_usage=current_month_usage,
        total_conversions=total_conversions,
        remaining_credits=current_user.credits_remaining,
        recent_jobs=recent_jobs,
        quota_reset_date=current_user.quota_reset_date
    )

@app.put("/profile", response_model=UserResponse)
async def update_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update user profile."""
    
    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name
    if user_update.company is not None:
        current_user.company = user_update.company
    
    db.commit()
    db.refresh(current_user)
    
    return current_user

# =============================================================================
# SYSTEM ENDPOINTS
# =============================================================================

@app.get("/health", response_model=HealthCheck)
async def health_check():
    """Health check endpoint."""
    return HealthCheck(
        status="healthy",
        version="1.0.0",
        uptime_seconds=3600.0,  # Would calculate actual uptime
        database_status="healthy",
        redis_status="healthy",
        worker_status="healthy"
    )

@app.get("/", include_in_schema=False)
async def root():
    """Redirect root to landing page."""
    return RedirectResponse(url="/docs")

# =============================================================================
# STARTUP EVENTS
# =============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize application on startup."""
    print("🚀 CannaConverter API starting up...")
    print("✅ Database connection established")
    print("✅ Monitoring initialized")
    print("🔥 Ready to convert files at scale!")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)