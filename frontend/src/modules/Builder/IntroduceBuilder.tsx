import { Container, Typography, Theme, Button } from "@mui/material";
import IntroduceBanner from "./component/IntroduceBanner";
import { styled } from "@mui/system";

const ImageContainer = styled(Container)({
  display: "flex",
  width: "100%",
  justifyContent: "center",
  alignItems: "center",
});

const MainContainer = styled(Container)({
  textAlign: "center",
  padding: (theme: Theme) => theme.spacing(4),
  margin: (theme: Theme) => theme.spacing(4),
});

const Title = styled(Typography)({
  fontSize: "2.5rem",
  fontWeight: "bold",
  marginBottom: (theme: Theme) => theme.spacing(2),
  color: (theme: Theme) => theme.palette.primary.main,
});

const Description = styled(Typography)({
  fontSize: "1.2rem",
  marginBottom: (theme: Theme) => theme.spacing(4),
});

const IntroduceBuilder = () => {
  return (
    <MainContainer>
      <ImageContainer>
        <IntroduceBanner maxWidth="100%" width="100%" height="auto" />
      </ImageContainer>
      <Title>가짜연구소 빌더(운영진) 8기 모집 </Title>
      <Description>
        <b>[초대 글]</b>
        <p>
          가짜연구소는 개인의 성장이 모여 앙상블할 기회를 만들고, 큰 성장을
          이루도록 돕고 있습니다. 큰 성장이 큰 울림을 만들어내고, 더 많은
          사람들이 가짜연구소로 모여들어 성장의 기회를 만들어냅니다. 이러한
          성장의 선순환이 이루어지는 공동체입니다.
          <br />
          <br />
          지난 3년간 개인과 커뮤니티 모두 믿을 수 없는 큰 성장을 이루었고,
          비영리적으로 한국의 머신러닝 생태계에 선한 영향력을 미치고 있으며,
          특이한 너드의 문화를 형성하여 다른 곳에서 느낄 수 없는 새로움도
          만들어나가고 있습니다.
          <br />
          <br />
          가짜연구소 운영진은 머신러닝과 커뮤니티에 관심이 있으신 분이라면
          누구나 신청이 가능합니다! 실력이 출중한 분이 필요하기 보다는, 팀과
          커뮤니티를 이끌며 목표까지 완주하는 것이 중요합니다! 그간의 경험으로는
          다양한 사람들이 팀원으로 함께하며 서로 부족한 부분을 채워주기에 제가
          부족하더라도 괜찮더라구요! 실력 있는 재야의 고수들도 누군가 이끌어주길
          기다리고 있습니다! 따라서, 함께 성장할 의지만 있다면 지원하세요!
          빌더가 단.연.코. 가장 많이 성장합니다! 2023년 하반기 성장의 주인공이
          되세요!
        </p>

        <b>[모집 내용]</b>
        <p>
          모집 목적: 가짜연구소의 공유, 동기부여, 함께하는 즐거움의 가치를
          실현하며, 머신러닝 분야에서 함께 성장함을 이끄는 지적 공동체를
          형성하고자 합니다. 운영진은 성장의 기회를 만드는 사람으로,
          머신러닝/데이터사이언스 생태계를 리딩하며 많은 사람들과 함께 성장하고,
          선한 영향력을 퍼뜨리며 우리의 삶과 인공지능을 더 나은 방향으로
          이끌고자 합니다. 주제: 머신러닝/데이터사이언스 전반에 더하여 개발과
          관련된 내용 모두! 지원 자격: 머신러닝에 관심이 있고, 책임감 있게 팀과
          공동체를 이끌며 개인과 공동체가 함께 성장하고 싶은 누구나
        </p>

        <b>[모집 부문]</b>
        <p>
          아카데미 빌더: 머신러닝/데이터사이언스 이론 스터디 및 최신 기술 탐구,
          경진 대회 및 공모전 참가, 튜토리얼 제작, 연구 및 논문 작성을 하는
          프로젝트를 이끕니다. 펠로우쉽 빌더: 목표에 맞게 DataCamp 교육 콘텐츠
          활용을 기획하고, 러너들과 원활히 스터디를 완주할 수 있도록
          퍼실리테이팅을 수행합니다. 오퍼레이션 빌더: 가짜연구소의 문화와 기술을
          알리고, 가짜연구소 생태계에 사람들을 모으고 성장하고 발전할 수 있는
          기회를 지속적으로 제공하도록 돕습니다. 데브 빌더: 가짜연구소의 다양한
          시스템, 사이트를 개발하며 커뮤니티의 기반에 기여하고, 커뮤니티의
          다양한 실험을 수행합니다.
        </p>

        <b>[일정]</b>
        <p>
          모집 기간: 2024년 1월 16(화)-26일(금) 활동 기간: 2024년 상반기 결과
          발표: 2024년 1월 28일(일) 이메일로 개별 연락
        </p>
        <b>[활동 규칙]</b>
        <p>
          디렉터의 매니지먼트 도움받기: 3주간의 온보딩 모임 참여, 결석체크, 자료
          공유 체크! 안정적으로 모임 운영하기: 혹시나 불참할 경우를 대비해
          모임을 이끌 수 있는 백업을 상시 준비! 소통 채널 관리하기: 노션 페이지,
          디스코드 채널을 잘 관리하여 러너와 원활히 소통! Building in
          Public하기: 3회의 블로그(프로젝트 기획 / 중간 점검 / 종합 및 후기)
          작성! 받고싶은 선물 포장하기: 팀/프로젝트의 자료와 성과를 잘 포장하고
          공유 및 발표하기!
          <br />
          상세 정보: <a href="#">빌더 모집 상세 페이지 </a>
        </p>
      </Description>
      <Button
        sx={{
          width: "100%",
          height: "50px",
          position: "fixed",
          left: 0,
          right: 0,
        }}
        variant="contained"
        color="primary"
        href="#"
      >
        빌더 지원하러 가기
      </Button>
    </MainContainer>
  );
};

export default IntroduceBuilder;
