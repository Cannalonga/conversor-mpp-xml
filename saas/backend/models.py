# CannaConverter SaaS Backend
# Models for User Management, Billing and Conversion Jobs

from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Numeric, Text, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid
import enum

Base = declarative_base()

# Enum Definitions
class PlanType(str, enum.Enum):
    STARTER = "starter"
    PROFESSIONAL = "professional"
    BUSINESS = "business"
    ENTERPRISE = "enterprise"

class JobStatus(str, enum.Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class ConverterType(str, enum.Enum):
    MPP_TO_XML = "mpp_to_xml"
    EXCEL_TO_JSON = "excel_to_json"
    EXCEL_TO_CSV = "excel_to_csv"
    EXCEL_TO_PARQUET = "excel_to_parquet"
    PDF_TO_JSON = "pdf_to_json"
    WORD_TO_JSON = "word_to_json"
    IMAGE_TO_JSON = "image_to_json"

class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

# =============================================================================
# USER MANAGEMENT
# =============================================================================

class User(Base):
    """
    User model with authentication and plan management
    """
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    company = Column(String(255), nullable=True)
    
    # Account Status
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    verification_token = Column(String(255), nullable=True)
    
    # Plan & Billing
    plan = Column(Enum(PlanType), default=PlanType.STARTER)
    credits_remaining = Column(Integer, default=10)  # Starter gets 10 free
    monthly_quota = Column(Integer, default=10)     # Monthly conversion limit
    quota_reset_date = Column(DateTime(timezone=True), nullable=True)
    
    # Limits per plan
    max_file_size_mb = Column(Integer, default=5)   # MB limit per file
    priority_processing = Column(Boolean, default=False)
    
    # API Access
    api_key = Column(String(64), unique=True, nullable=True)
    api_rate_limit = Column(Integer, default=100)   # Requests per hour
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    conversion_jobs = relationship("ConversionJob", back_populates="user")
    billing_records = relationship("BillingRecord", back_populates="user")
    usage_logs = relationship("UsageLog", back_populates="user")

class UserSettings(Base):
    """
    User preferences and configuration
    """
    __tablename__ = "user_settings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Notification preferences
    email_notifications = Column(Boolean, default=True)
    webhook_url = Column(String(1024), nullable=True)
    webhook_secret = Column(String(255), nullable=True)
    
    # Processing preferences
    default_output_format = Column(String(32), default="json")
    auto_delete_files = Column(Boolean, default=True)
    file_retention_days = Column(Integer, default=7)
    
    # UI preferences
    theme = Column(String(16), default="light")
    timezone = Column(String(64), default="America/Sao_Paulo")
    language = Column(String(8), default="pt-BR")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

# =============================================================================
# CONVERSION JOBS
# =============================================================================

class ConversionJob(Base):
    """
    Individual conversion jobs with detailed tracking
    """
    __tablename__ = "conversion_jobs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # File Information
    original_filename = Column(String(512), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    file_hash = Column(String(64), nullable=True)  # SHA256 for deduplication
    
    # Conversion Details
    converter_type = Column(Enum(ConverterType), nullable=False)
    input_format = Column(String(32), nullable=False)
    output_format = Column(String(32), nullable=False)
    
    # Processing Status
    status = Column(Enum(JobStatus), default=JobStatus.QUEUED)
    progress_percent = Column(Integer, default=0)
    worker_id = Column(String(128), nullable=True)
    
    # Results
    output_url = Column(String(1024), nullable=True)
    output_size_bytes = Column(Integer, nullable=True)
    rows_processed = Column(Integer, default=0)
    columns_detected = Column(Integer, default=0)
    
    # Performance Metrics
    queue_time_seconds = Column(Numeric(10, 3), nullable=True)
    processing_time_seconds = Column(Numeric(10, 3), nullable=True)
    total_time_seconds = Column(Numeric(10, 3), nullable=True)
    
    # Error Handling
    error_message = Column(Text, nullable=True)
    error_code = Column(String(32), nullable=True)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    
    # Billing
    credits_consumed = Column(Integer, default=1)
    cost_usd = Column(Numeric(10, 4), default=0)
    billing_processed = Column(Boolean, default=False)
    
    # Priority & Scheduling
    priority = Column(Integer, default=5)  # 1=highest, 10=lowest
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    
    # Metadata
    metadata = Column(JSONB, nullable=True)  # Additional conversion parameters
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="conversion_jobs")

class ConversionTemplate(Base):
    """
    Reusable conversion templates for common scenarios
    """
    __tablename__ = "conversion_templates"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Template Configuration
    converter_type = Column(Enum(ConverterType), nullable=False)
    output_format = Column(String(32), nullable=False)
    configuration = Column(JSONB, nullable=True)  # Converter-specific settings
    
    # Usage Statistics
    usage_count = Column(Integer, default=0)
    last_used = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

# =============================================================================
# BILLING & PAYMENTS
# =============================================================================

class BillingRecord(Base):
    """
    Billing records for subscriptions and usage-based charges
    """
    __tablename__ = "billing_records"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Transaction Details
    transaction_type = Column(String(32), nullable=False)  # subscription, overage, credit_purchase
    amount_brl = Column(Numeric(10, 2), nullable=False)
    amount_usd = Column(Numeric(10, 2), nullable=True)
    currency = Column(String(3), default="BRL")
    
    # Payment Information
    payment_method = Column(String(32), default="pix")  # pix, credit_card, invoice
    payment_status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    payment_provider = Column(String(64), nullable=True)  # mercadopago, stripe
    payment_id = Column(String(255), nullable=True)      # External payment ID
    
    # PIX Integration
    pix_qr_code = Column(Text, nullable=True)
    pix_code = Column(String(255), nullable=True)
    pix_expiry = Column(DateTime(timezone=True), nullable=True)
    
    # Invoice Details
    invoice_number = Column(String(64), nullable=True)
    invoice_pdf_url = Column(String(1024), nullable=True)
    
    # Plan Changes
    old_plan = Column(Enum(PlanType), nullable=True)
    new_plan = Column(Enum(PlanType), nullable=True)
    plan_period_start = Column(DateTime(timezone=True), nullable=True)
    plan_period_end = Column(DateTime(timezone=True), nullable=True)
    
    # Credits and Usage
    credits_purchased = Column(Integer, default=0)
    conversions_included = Column(Integer, default=0)
    
    # Metadata
    description = Column(Text, nullable=True)
    metadata = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    paid_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="billing_records")

class Subscription(Base):
    """
    Active subscription tracking
    """
    __tablename__ = "subscriptions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True)
    
    # Subscription Details
    plan_type = Column(Enum(PlanType), nullable=False)
    status = Column(String(32), default="active")  # active, cancelled, past_due, trialing
    
    # Billing Cycle
    current_period_start = Column(DateTime(timezone=True), nullable=False)
    current_period_end = Column(DateTime(timezone=True), nullable=False)
    trial_end = Column(DateTime(timezone=True), nullable=True)
    
    # Pricing
    monthly_price_brl = Column(Numeric(10, 2), nullable=False)
    yearly_price_brl = Column(Numeric(10, 2), nullable=True)
    billing_cycle = Column(String(16), default="monthly")  # monthly, yearly
    
    # Auto-renewal
    auto_renew = Column(Boolean, default=True)
    cancel_at_period_end = Column(Boolean, default=False)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    
    # External Integration
    external_subscription_id = Column(String(255), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

# =============================================================================
# USAGE TRACKING & ANALYTICS
# =============================================================================

class UsageLog(Base):
    """
    Detailed usage tracking for analytics and billing
    """
    __tablename__ = "usage_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Event Tracking
    event_type = Column(String(64), nullable=False)  # api_call, conversion, download, etc.
    resource_type = Column(String(64), nullable=True)
    resource_id = Column(String(255), nullable=True)
    
    # Request Details
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(512), nullable=True)
    api_endpoint = Column(String(255), nullable=True)
    http_method = Column(String(10), nullable=True)
    
    # Performance
    response_time_ms = Column(Integer, nullable=True)
    response_status = Column(Integer, nullable=True)
    
    # Volume Tracking
    bytes_processed = Column(Integer, nullable=True)
    items_processed = Column(Integer, default=1)
    
    # Geographic
    country_code = Column(String(3), nullable=True)
    city = Column(String(128), nullable=True)
    
    # Metadata
    metadata = Column(JSONB, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="usage_logs")

class QuotaUsage(Base):
    """
    Monthly quota usage tracking per user
    """
    __tablename__ = "quota_usage"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Period Tracking
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    
    # Usage Counters
    conversions_used = Column(Integer, default=0)
    conversions_quota = Column(Integer, nullable=False)
    overage_conversions = Column(Integer, default=0)
    
    # Data Volume
    bytes_processed = Column(Integer, default=0)
    bytes_quota = Column(Integer, nullable=True)
    overage_bytes = Column(Integer, default=0)
    
    # API Usage
    api_calls_used = Column(Integer, default=0)
    api_calls_quota = Column(Integer, nullable=False)
    
    # Cost Tracking
    overage_cost_brl = Column(Numeric(10, 2), default=0)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Unique constraint on user/period
    __table_args__ = (
        sqlalchemy.UniqueConstraint('user_id', 'year', 'month'),
    )

# =============================================================================
# SYSTEM CONFIGURATION
# =============================================================================

class SystemConfiguration(Base):
    """
    System-wide configuration and feature flags
    """
    __tablename__ = "system_configuration"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    key = Column(String(128), unique=True, nullable=False)
    value = Column(Text, nullable=False)
    value_type = Column(String(16), default="string")  # string, integer, boolean, json
    description = Column(Text, nullable=True)
    
    # Environment
    environment = Column(String(16), default="production")  # development, staging, production
    
    # Change Tracking
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(UUID(as_uuid=True), nullable=True)

class ApiKey(Base):
    """
    API Key management with scopes and rate limiting
    """
    __tablename__ = "api_keys"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Key Details
    key_id = Column(String(32), unique=True, nullable=False)  # Public identifier
    key_hash = Column(String(128), nullable=False)           # Hashed secret
    name = Column(String(255), nullable=False)
    
    # Permissions
    scopes = Column(JSONB, nullable=False)  # ["convert", "read", "write"]
    
    # Rate Limiting
    rate_limit_rpm = Column(Integer, default=60)    # Requests per minute
    rate_limit_daily = Column(Integer, default=1000) # Daily request limit
    
    # Status
    is_active = Column(Boolean, default=True)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    usage_count = Column(Integer, default=0)
    
    # Security
    allowed_ips = Column(JSONB, nullable=True)  # IP whitelist
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)

# =============================================================================
# PLAN CONFIGURATION
# =============================================================================

# Plan limits configuration
PLAN_LIMITS = {
    PlanType.STARTER: {
        "monthly_conversions": 10,
        "max_file_size_mb": 5,
        "api_rate_limit_rpm": 10,
        "priority_processing": False,
        "webhooks": False,
        "sla_percentage": None,
        "support_level": "email",
        "monthly_price_brl": 0
    },
    PlanType.PROFESSIONAL: {
        "monthly_conversions": 1000,
        "max_file_size_mb": 50,
        "api_rate_limit_rpm": 60,
        "priority_processing": True,
        "webhooks": True,
        "sla_percentage": 99.0,
        "support_level": "priority_email",
        "monthly_price_brl": 49
    },
    PlanType.BUSINESS: {
        "monthly_conversions": 10000,
        "max_file_size_mb": 200,
        "api_rate_limit_rpm": 300,
        "priority_processing": True,
        "webhooks": True,
        "sla_percentage": 99.9,
        "support_level": "dedicated_account_manager",
        "monthly_price_brl": 249
    },
    PlanType.ENTERPRISE: {
        "monthly_conversions": -1,  # Unlimited
        "max_file_size_mb": -1,     # Unlimited
        "api_rate_limit_rpm": -1,   # Unlimited
        "priority_processing": True,
        "webhooks": True,
        "sla_percentage": 99.95,
        "support_level": "24x7_dedicated",
        "monthly_price_brl": None   # Custom pricing
    }
}