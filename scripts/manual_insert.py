import asyncio
import os
from datetime import datetime
from zoneinfo import ZoneInfo

import pandas as pd
from dotenv import load_dotenv
import aiomysql

# .env 파일 로드
load_dotenv()

# 데이터베이스 설정
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_DATABASE = os.getenv("DB_DATABASE")
EXCEL_PATH = os.getenv("EXCEL_PATH", "list.xlsx")  # 기본값 설정

# print(DB_USER, DB_PASSWORD, DB_DATABASE)
if not all([DB_USER, DB_PASSWORD, DB_DATABASE]):
    raise ValueError("데이터베이스 설정이 완료되지 않았습니다. (DB_USER, DB_PASSWORD, DB_NAME 필요)")

async def import_users_from_excel() -> None:
    """
    엑셀 파일에서 사용자 데이터를 읽어와 데이터베이스에 저장합니다.
    """
    if not os.path.exists(EXCEL_PATH):
        raise FileNotFoundError(f"엑셀 파일을 찾을 수 없습니다: {EXCEL_PATH}")
    
    # 엑셀 파일 읽기
    df = pd.read_excel(EXCEL_PATH)
    required_columns = ['ID', '이름', '이메일']
    
    # 필수 컬럼 확인
    if not all(col in df.columns for col in required_columns):
        raise ValueError(f"엑셀 파일에 필수 컬럼이 없습니다. 필요한 컬럼: {required_columns}")
    
    # 데이터베이스 연결
    pool = await aiomysql.create_pool(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        db=DB_DATABASE,
        autocommit=True
    )
    
    success_count = 0
    error_count = 0
    
    try:
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                for _, row in df.iterrows():
                    try:
                        # 이메일 중복 확인
                        await cur.execute(
                            "SELECT 1 FROM bingo_user WHERE user_email = %s",
                            (row['이메일'],)
                        )
                        if await cur.fetchone():
                            print(f"사용자 생성 실패: {row['이름']} ({row['이메일']}) - 이미 존재하는 이메일입니다.")
                            error_count += 1
                            continue

                        # 사용자 생성
                        await cur.execute("""
                            INSERT INTO bingo_user (user_name, user_email, umoh_id, privacy_agreed, created_at)
                            VALUES (%s, %s, %s, %s, %s)
                        """, (
                            row['이름'],
                            row['이메일'],
                            row['ID'],  # umoh_id에 엑셀의 ID 값 저장
                            False,
                            datetime.now(ZoneInfo("Asia/Seoul"))
                        ))
                        
                        print(f"사용자 생성 성공: {row['이름']} ({row['이메일']})")
                        success_count += 1
                    except Exception as e:
                        print(f"사용자 생성 실패: {row['이름']} ({row['이메일']}) - {str(e)}")
                        error_count += 1
    finally:
        pool.close()
        await pool.wait_closed()
    
    print(f"\n임포트 완료:")
    print(f"성공: {success_count}건")
    print(f"실패: {error_count}건")

if __name__ == "__main__":
    # 비동기 함수 실행
    asyncio.run(import_users_from_excel()) 