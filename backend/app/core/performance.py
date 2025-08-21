"""
Performance optimization configuration for Tekrowe BlogPilot
"""

import os
from typing import Dict, Any

class PerformanceConfig:
    """Performance optimization settings"""
    
    # Database connection pooling
    DB_POOL_SIZE = int(os.getenv('DB_POOL_SIZE', '20'))
    DB_MAX_OVERFLOW = int(os.getenv('DB_MAX_OVERFLOW', '30'))
    DB_POOL_RECYCLE = int(os.getenv('DB_POOL_RECYCLE', '3600'))
    DB_POOL_PRE_PING = os.getenv('DB_POOL_PRE_PING', 'true').lower() == 'true'
    
    # API response caching
    ENABLE_CACHE = os.getenv('ENABLE_CACHE', 'true').lower() == 'true'
    CACHE_TTL = int(os.getenv('CACHE_TTL', '300'))  # 5 minutes
    
    # Frontend polling intervals (in milliseconds)
    ACTIVE_PROCESS_POLL_INTERVAL = int(os.getenv('ACTIVE_PROCESS_POLL_INTERVAL', '2000'))  # 2 seconds
    INACTIVE_PROCESS_POLL_INTERVAL = int(os.getenv('INACTIVE_PROCESS_POLL_INTERVAL', '10000'))  # 10 seconds
    
    # Pipeline execution settings
    PIPELINE_STEP_DELAY = float(os.getenv('PIPELINE_STEP_DELAY', '0.5'))  # 0.5 seconds
    MAX_CONCURRENT_PIPELINES = int(os.getenv('MAX_CONCURRENT_PIPELINES', '5'))
    
    # Database optimization
    ENABLE_DB_OPTIMIZATION = os.getenv('ENABLE_DB_OPTIMIZATION', 'true').lower() == 'true'
    DB_OPTIMIZATION_INTERVAL = int(os.getenv('DB_OPTIMIZATION_INTERVAL', '3600'))  # 1 hour
    
    # Logging and monitoring
    ENABLE_PERFORMANCE_LOGGING = os.getenv('ENABLE_PERFORMANCE_LOGGING', 'true').lower() == 'true'
    SLOW_QUERY_THRESHOLD = float(os.getenv('SLOW_QUERY_THRESHOLD', '1.0'))  # 1 second
    
    @classmethod
    def get_database_config(cls) -> Dict[str, Any]:
        """Get database configuration for SQLAlchemy"""
        return {
            'pool_size': cls.DB_POOL_SIZE,
            'max_overflow': cls.DB_MAX_OVERFLOW,
            'pool_recycle': cls.DB_POOL_RECYCLE,
            'pool_pre_ping': cls.DB_POOL_PRE_PING,
        }
    
    @classmethod
    def get_frontend_config(cls) -> Dict[str, Any]:
        """Get frontend configuration for polling intervals"""
        return {
            'active_process_poll_interval': cls.ACTIVE_PROCESS_POLL_INTERVAL,
            'inactive_process_poll_interval': cls.INACTIVE_PROCESS_POLL_INTERVAL,
        }
    
    @classmethod
    def get_pipeline_config(cls) -> Dict[str, Any]:
        """Get pipeline execution configuration"""
        return {
            'step_delay': cls.PIPELINE_STEP_DELAY,
            'max_concurrent': cls.MAX_CONCURRENT_PIPELINES,
        }

# Performance monitoring decorator
def monitor_performance(operation_name: str):
    """Decorator to monitor performance of operations"""
    def decorator(func):
        import time
        import logging
        
        logger = logging.getLogger(__name__)
        
        def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                execution_time = time.time() - start_time
                
                if PerformanceConfig.ENABLE_PERFORMANCE_LOGGING:
                    if execution_time > PerformanceConfig.SLOW_QUERY_THRESHOLD:
                        logger.warning(f"Slow {operation_name}: {execution_time:.3f}s")
                    else:
                        logger.info(f"{operation_name}: {execution_time:.3f}s")
                
                return result
            except Exception as e:
                execution_time = time.time() - start_time
                logger.error(f"Error in {operation_name} after {execution_time:.3f}s: {e}")
                raise
        
        return wrapper
    return decorator
