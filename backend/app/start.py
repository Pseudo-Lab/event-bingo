import dotenv
import argparse
import logging
from core.log import logger  # core/log.py의 logger 사용

from main import app

dotenv.load_dotenv("config/.env")

# Argument parser for log level
parser = argparse.ArgumentParser(
    description="Start the application with specified log level."
)
parser.add_argument(
    "--log-level",
    type=str,
    default="INFO",
    choices=["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"],
    help="Set the logging level (default: INFO)",
)
args = parser.parse_args()
print(args)

# Set logging level for the logger
logger.setLevel(getattr(logging, args.log_level.upper(), "INFO"))

def main():
    import uvicorn

    # uvicorn 로거 설정
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        reload=False,
        workers=4,
        log_level=args.log_level.lower(),
        # log_config=None  # uvicorn 기본 로깅 비활성화
    )

if __name__ == "__main__":
    main()
