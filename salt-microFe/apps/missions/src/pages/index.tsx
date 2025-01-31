import Missions from "@/components/MissionsApp/Missions/Missions";
import { Wrapper } from "@repo/ui/wrapper";
import { Card } from "@repo/ui/card";
export default function MissionsApp() {
  return (
    <Wrapper>
      <Card size="lg">
        <Missions />
      </Card>
    </Wrapper>
  );
}
