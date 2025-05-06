import os
import logging
from logging.handlers import RotatingFileHandler

# 로깅 레벨 설정 (DEBUG, INFO, WARNING, ERROR, CRITICAL)
log_format = "%(asctime)s [%(levelname)s] %(message)s"
date_format = "%Y-%m-%d %H:%M:%S"
formatter = logging.Formatter(log_format, datefmt=date_format)

# 로그 핸들러 설정 (파일 핸들러)
os.makedirs("logs", exist_ok=True)
log_filename = "logs/psudo_backend.log"
max_log_size = 5 * 1024 * 1024  # 5 MB
backup_count = 3  # 로그 파일 백업 개수

file_handler = RotatingFileHandler(log_filename, maxBytes=max_log_size, backupCount=backup_count)
file_handler.setFormatter(formatter)

# 콘솔 핸들러 추가
console_handler = logging.StreamHandler()
console_handler.setFormatter(formatter)

# 로거 설정
logger = logging.getLogger("pseudo_backend")
logger.setLevel(logging.INFO)  # 기본 로깅 레벨 설정
logger.addHandler(file_handler)
logger.addHandler(console_handler)
