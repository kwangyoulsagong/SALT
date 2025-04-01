import Games from "@/components/GamesApp/Games/Games";
import { Card } from "@repo/ui/card";
import { Wrapper } from "@repo/ui/wrapper";
export default function GameApp() {
  return (
    <Wrapper>
      <Card size="lg">
        <Games />
      </Card>
    </Wrapper>
  );
}
