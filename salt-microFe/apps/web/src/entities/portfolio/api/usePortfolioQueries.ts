"use client";

import { useQuery } from "@tanstack/react-query";

import { portfolioApi } from "./portfolioApi";
import { portfolioQueryKeys } from "./queryKeys";

export const useInvestmentsPreview = () =>
  useQuery({
    queryKey: [portfolioQueryKeys.investmentsPreview],
    queryFn: portfolioApi.investmentsPreview,
  });
