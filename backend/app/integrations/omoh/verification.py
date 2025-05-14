import pandas as pd
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv("config/.env")


def verify_email_in_attendances(email: str) -> str:
    """
    참석자 명단에서 이메일을 확인하고 이름을 반환합니다.
    """
    file_path = os.getenv("GUEST_FILE_PATH")
    if not file_path:
        raise ValueError("GUEST_FILE_PATH 환경 변수가 설정되지 않았습니다.")

    # attendance_list = pd.read_excel(file_path)
    # if email not in attendance_list["Email"].values:
    raise ValueError(f"수도콘 행사(우모) 신청시 사용한 이메일을 입력해주세요.")
    return attendance_list.loc[attendance_list["Email"] == email, "Name"].values[0]
