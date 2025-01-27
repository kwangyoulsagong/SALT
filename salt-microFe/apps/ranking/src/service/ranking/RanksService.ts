interface RanksServiceProps {
  globalRanks: {
    top: boolean;
    ranks: number;
  };
  familyRanks: {
    top: boolean;
    ranks: number;
  };
}
interface RankDisplay {
  text: string;
  icon?: string;
}
type RankKey = 1 | 3;

const ranksIcon: Record<RankKey, string> = {
  1: "/assets/ranks/top1.svg",
  3: "/assets/ranks/top3.svg",
};
export class RanksService {
  ranks({ globalRanks, familyRanks }: RanksServiceProps): {
    globalRank: RankDisplay;
    familyRank: RankDisplay;
  } {
    const globalRank =
      globalRanks.top === true && globalRanks.ranks < 4
        ? {
            text: `${globalRanks.ranks}등`,
            icon: ranksIcon[globalRanks.ranks as RankKey],
          }
        : {
            text: `상위 ${globalRanks.ranks}%`,
          };
    const familyRank =
      familyRanks.top === true && familyRanks.ranks < 4
        ? {
            text: `${familyRanks.ranks}등`,
            icon: ranksIcon[familyRanks.ranks as RankKey],
          }
        : {
            text: `상위 ${familyRanks.ranks}%`,
          };
    return { globalRank, familyRank };
  }
}
