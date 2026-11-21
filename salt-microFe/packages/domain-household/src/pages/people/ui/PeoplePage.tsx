import { ROUTES } from "@repo/web-shared/config";
import { BlockBoundary } from "@repo/web-shared/ui";
import { BackNav, PageFrame } from "@repo/web-shared/ui/frame";
import { panelDescription, panelTitle } from "@repo/web-shared/ui/surface.css";

import { HOUSEHOLD_TRAIL } from "@/entities/household";
import { PEOPLE_PAGE as M, readPerson, readYear } from "../model";
import { PeopleBoard } from "./PeopleBoard";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** 사람 장부 `/household/people`(`FE-REQ-057` FR-8, 가계부 S1h) — `?year=` · `?person=` 를 읽어 잎에 넘긴다 */
export const PeoplePage = async ({
  searchParams,
}: {
  searchParams: SearchParams;
}) => {
  const q = await searchParams;
  const year = readYear(q.year);
  const person = readPerson(q.person);
  return (
    <PageFrame surface="cards">
      <BackNav
        label={M.back}
        trailLabel={HOUSEHOLD_TRAIL.label}
        fallbackHref={ROUTES.household}
        crumbs={[
          { label: HOUSEHOLD_TRAIL.household, href: ROUTES.household },
          { label: M.title },
        ]}
      />
      <h1 className={panelTitle}>{M.title}</h1>
      <p className={panelDescription}>{M.description}</p>
      <BlockBoundary name={M.blockName} minHeight={320}>
        <PeopleBoard year={year} person={person} />
      </BlockBoundary>
    </PageFrame>
  );
};

export default PeoplePage;
