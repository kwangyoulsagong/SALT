import Link from "next/link";

import { ROUTES } from "@repo/web-shared/config";
import { BlockBoundary } from "@repo/web-shared/ui";
import { backLink, panelDescription, panelTitle } from "@repo/web-shared/ui/surface.css";

import { PEOPLE_PAGE as M, readPerson, readYear } from "../model";
import { PeopleBoard } from "./PeopleBoard";
import * as s from "./people.css";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** 사람 장부 `/household/people`(`FE-REQ-057` FR-8, 가계부 S1h) — `?year=` · `?person=` 를 읽어 잎에 넘긴다 */
export const PeoplePage = async ({ searchParams }: { searchParams: SearchParams }) => {
  const q = await searchParams;
  const year = readYear(q.year);
  const person = readPerson(q.person);
  return (
    <div className={s.page}>
      <Link href={ROUTES.household} className={backLink}>
        {M.back}
      </Link>
      <h1 className={panelTitle}>{M.title}</h1>
      <p className={panelDescription}>{M.description}</p>
      <BlockBoundary name={M.blockName} minHeight={320}>
        <PeopleBoard year={year} person={person} />
      </BlockBoundary>
    </div>
  );
};

export default PeoplePage;
