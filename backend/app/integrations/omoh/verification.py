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

    attendance_list = pd.read_excel(file_path)
    if email not in attendance_list["Email"].values:
        raise ValueError(
            "입력하신 이메일은 행사에 등록된 정보와 일치하지 않습니다.\n"
            "비회원으로 로그인 시, 빙고의 다양한 기능을 이용하실 수 없습니다.\n"
            "원활한 이용을 위해 우모 사이트에 가입하신 이메일로 로그인해 주세요.\n"
            "수도콘 행사 페이지(우모) 링크에서 이메일을 확인해보세요."
        )
    return attendance_list.loc[attendance_list["Email"] == email, "Name"].values[0]
