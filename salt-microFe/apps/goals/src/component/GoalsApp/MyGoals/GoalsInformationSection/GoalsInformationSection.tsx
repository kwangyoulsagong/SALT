import Saved from "./Saved/SavedWrapper";
import SaveInformation from "./SaveInformation/SaveInformation";
import { Icon } from "@repo/ui/icon";
import { Text } from "@repo/ui/text";
import { Heading } from "@repo/ui/heading";
import { Button } from "@repo/ui/button";
import { useRouter } from "next/router";
import { FlexBox } from "@repo/ui/flexBox";
import { Section } from "@repo/ui/section";
import { Container } from "@repo/ui/container";
interface savedProps {
  saved: {
    money: string;
    thumbnail: string;
  };
}

const GoalsInformationSection = ({ saved }: savedProps) => {
  const router = useRouter();
  const handleClick = () => {
    router.push("/goals/addgoals");
  };
  return (
    <Container size="full">
      <FlexBox justify="between" align="center">
        <Saved>
          <Icon url={saved.thumbnail} />
          <SaveInformation>
            <Heading level={2}>{saved.money}원</Heading>
            <Text color="muted">현재 모은 금액</Text>
          </SaveInformation>
        </Saved>
        <Button variant="primary" size="sm" onClick={handleClick}>
          추가
        </Button>
      </FlexBox>
    </Container>
  );
};
export default GoalsInformationSection;
