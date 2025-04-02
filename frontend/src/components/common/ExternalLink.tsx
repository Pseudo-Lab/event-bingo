import styled from "@emotion/styled";

type ExternalLinkProps = {
  href: string;
  children: React.ReactNode;
};

const StyledLink = styled.a`
  text-decoration: none;
  color: inherit; /* 부모 엘리먼트의 색상을 상속받음 */

  &:visited {
    color: inherit; /* 방문한 링크에 대한 색상을 상속받음 */
  }
`;

const ExternalLink = (props: ExternalLinkProps) => {
  return (
    <StyledLink href={props.href} target="_blank" rel="noopener noreferrer">
      {props.children}
    </StyledLink>
  );
};

export default ExternalLink;
