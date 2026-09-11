import { Card } from "@repo/ui/card";
import Tips from "./Tips/Tips";
import { Container } from "@repo/ui/container";
const Tip = () => {
  return (
    <Container size="full">
      <Card>
        <Tips />
      </Card>
    </Container>
  );
};
export default Tip;
