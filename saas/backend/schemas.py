# CannaConverter SaaS - Pydantic Schemas for API Request/Response
# Type-safe data models for FastAPI endpoints

from pydantic import BaseModel, EmailStr, Field, validator, root_validator
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum

from .models import PlanType, JobStatus, ConverterType, PaymentStatus

# =============================================================================
# USER SCHEMAS
# =============================================================================

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    company: Optional[str] = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    company: Optional[str] = None
    
class UserResponse(UserBase):
    id: str
    plan: PlanType
    credits_remaining: int
    monthly_quota: int
    max_file_size_mb: int
    is_active: bool
    is_verified: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class UserDashboard(BaseModel):
    user: UserResponse
    current_month_usage: int
    total_conversions: int
    remaining_credits: int
    recent_jobs: List["ConversionJobSummary"]
    quota_reset_date: Optional[datetime]

# =============================================================================
# AUTHENTICATION SCHEMAS
# =============================================================================

class TokenData(BaseModel):
    email: Optional[str] = None

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse

class TokenRefresh(BaseModel):
    refresh_token: str

class PasswordReset(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)

class EmailVerification(BaseModel):
    token: str

class ChangePassword(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)

# =============================================================================
# CONVERSION JOB SCHEMAS
# =============================================================================

class ConversionJobCreate(BaseModel):
    converter_type: ConverterType
    output_format: str = Field(..., description="Output format (json, xml, csv, parquet)")
    webhook_url: Optional[str] = None
    priority: Optional[int] = Field(5, ge=1, le=10, description="Priority 1-10 (1=highest)")
    metadata: Optional[Dict[str, Any]] = None

class ConversionJobUpdate(BaseModel):
    webhook_url: Optional[str] = None
    priority: Optional[int] = Field(None, ge=1, le=10)

class ConversionJobSummary(BaseModel):
    id: str
    original_filename: str
    converter_type: ConverterType
    output_format: str
    status: JobStatus
    progress_percent: int
    created_at: datetime
    completed_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class ConversionJobDetail(ConversionJobSummary):
    file_size_bytes: int
    output_url: Optional[str] = None
    output_size_bytes: Optional[int] = None
    rows_processed: int
    columns_detected: int
    queue_time_seconds: Optional[float] = None
    processing_time_seconds: Optional[float] = None
    total_time_seconds: Optional[float] = None
    error_message: Optional[str] = None
    error_code: Optional[str] = None
    retry_count: int
    credits_consumed: int
    metadata: Optional[Dict[str, Any]] = None

class ConversionJobList(BaseModel):
    jobs: List[ConversionJobSummary]
    total_count: int
    page: int
    per_page: int
    has_next: bool
    has_prev: bool

class FileUploadResponse(BaseModel):
    job_id: str
    status: str = "queued"
    estimated_completion: Optional[datetime] = None
    message: str = "File uploaded successfully. Conversion started."

# =============================================================================
# BILLING SCHEMAS
# =============================================================================

class PlanLimits(BaseModel):
    monthly_conversions: int
    max_file_size_mb: int
    api_rate_limit_rpm: int
    priority_processing: bool
    webhooks: bool
    sla_percentage: Optional[float] = None
    support_level: str
    monthly_price_brl: Optional[float] = None

class SubscriptionResponse(BaseModel):
    plan_type: PlanType
    status: str
    current_period_start: datetime
    current_period_end: datetime
    trial_end: Optional[datetime] = None
    monthly_price_brl: float
    billing_cycle: str
    auto_renew: bool
    cancel_at_period_end: bool
    
    class Config:
        from_attributes = True

class BillingRecordResponse(BaseModel):
    id: str
    transaction_type: str
    amount_brl: float
    currency: str
    payment_status: PaymentStatus
    payment_method: str
    description: Optional[str] = None
    created_at: datetime
    paid_at: Optional[datetime] = None
    invoice_pdf_url: Optional[str] = None
    
    class Config:
        from_attributes = True

class CreateCheckout(BaseModel):
    plan_type: PlanType
    billing_cycle: str = Field("monthly", regex="^(monthly|yearly)$")
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None

class CheckoutResponse(BaseModel):
    checkout_url: str
    payment_id: str
    pix_qr_code: Optional[str] = None
    pix_code: Optional[str] = None
    expires_at: datetime

class UsageResponse(BaseModel):
    current_period: Dict[str, Any]
    historical: List[Dict[str, Any]]
    projected_overage: Optional[float] = None

# =============================================================================
# API KEY SCHEMAS
# =============================================================================

class ApiKeyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    scopes: List[str] = Field(..., description="Allowed scopes: read, write, convert")
    expires_days: Optional[int] = Field(None, ge=1, le=365)

class ApiKeyResponse(BaseModel):
    id: str
    key_id: str
    name: str
    scopes: List[str]
    is_active: bool
    created_at: datetime
    last_used_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    usage_count: int
    
    class Config:
        from_attributes = True

class ApiKeyCreated(ApiKeyResponse):
    secret: str = Field(..., description="Save this secret - it won't be shown again!")

# =============================================================================
# SETTINGS SCHEMAS
# =============================================================================

class UserSettingsUpdate(BaseModel):
    email_notifications: Optional[bool] = None
    webhook_url: Optional[str] = None
    default_output_format: Optional[str] = None
    auto_delete_files: Optional[bool] = None
    file_retention_days: Optional[int] = Field(None, ge=1, le=90)
    theme: Optional[str] = Field(None, regex="^(light|dark)$")
    timezone: Optional[str] = None
    language: Optional[str] = Field(None, regex="^(pt-BR|en-US)$")

class UserSettingsResponse(BaseModel):
    email_notifications: bool
    webhook_url: Optional[str] = None
    webhook_secret: Optional[str] = None
    default_output_format: str
    auto_delete_files: bool
    file_retention_days: int
    theme: str
    timezone: str
    language: str
    
    class Config:
        from_attributes = True

# =============================================================================
# ADMIN SCHEMAS
# =============================================================================

class AdminUserList(BaseModel):
    users: List[UserResponse]
    total_count: int
    active_count: int
    new_signups_today: int

class AdminStats(BaseModel):
    total_users: int
    active_subscriptions: int
    total_conversions_today: int
    total_conversions_month: int
    revenue_month_brl: float
    top_converters: List[Dict[str, Any]]
    system_health: Dict[str, Any]

class AdminJobsList(BaseModel):
    jobs: List[ConversionJobDetail]
    total_count: int
    queued_count: int
    processing_count: int
    failed_count: int

# =============================================================================
# ERROR SCHEMAS
# =============================================================================

class ErrorResponse(BaseModel):
    error: str
    message: str
    details: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ValidationErrorResponse(BaseModel):
    error: str = "validation_error"
    message: str = "Input validation failed"
    field_errors: List[Dict[str, str]]

# =============================================================================
# WEBHOOK SCHEMAS
# =============================================================================

class WebhookJobCompleted(BaseModel):
    event_type: str = "job.completed"
    job_id: str
    user_id: str
    status: JobStatus
    original_filename: str
    output_url: Optional[str] = None
    processing_time_seconds: Optional[float] = None
    error_message: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        from_attributes = True

class WebhookPaymentCompleted(BaseModel):
    event_type: str = "payment.completed"
    user_id: str
    transaction_id: str
    amount_brl: float
    plan_type: Optional[PlanType] = None
    credits_added: Optional[int] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# =============================================================================
# SYSTEM SCHEMAS
# =============================================================================

class HealthCheck(BaseModel):
    status: str = "healthy"
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    version: str
    uptime_seconds: float
    database_status: str
    redis_status: str
    worker_status: str

class SystemMetrics(BaseModel):
    active_users: int
    queued_jobs: int
    processing_jobs: int
    worker_count: int
    memory_usage_mb: float
    cpu_usage_percent: float
    disk_usage_percent: float

# =============================================================================
# CONVERTER-SPECIFIC SCHEMAS
# =============================================================================

class ExcelConversionOptions(BaseModel):
    sheet_names: Optional[List[str]] = None
    include_headers: bool = True
    max_rows: Optional[int] = None
    date_format: str = "iso"
    numeric_precision: int = 2

class MPPConversionOptions(BaseModel):
    include_tasks: bool = True
    include_resources: bool = True
    include_assignments: bool = True
    export_format: str = "xml"

class PDFConversionOptions(BaseModel):
    extract_tables: bool = True
    extract_text: bool = True
    extract_images: bool = False
    page_range: Optional[str] = None  # "1-10" or "1,3,5"

# Forward reference resolution
ConversionJobSummary.model_rebuild()
UserDashboard.model_rebuild()