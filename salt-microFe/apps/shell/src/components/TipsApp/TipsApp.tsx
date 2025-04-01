import { Wrapper } from "@repo/ui/wrapper";
import { Card } from "@repo/ui/card";
import Tips from "./Tips/Tips";
const Tip = () => {
  return (
    <Wrapper>
      <Card size="lg">
        <Tips />
      </Card>
    </Wrapper>
  );
};
export default Tip;
