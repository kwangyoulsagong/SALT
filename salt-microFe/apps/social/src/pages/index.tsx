import Social from "@/components/SocialApp/Social/Social";
import { Card } from "@repo/ui/card";
import { Wrapper } from "@repo/ui/wrapper";
export default function SocialApp() {
  return (
    <Wrapper>
      <Card size="lg">
        <Social />
      </Card>
    </Wrapper>
  );
}
