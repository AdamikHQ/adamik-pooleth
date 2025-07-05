import { AllAgentConfigsType } from "@/app/types";
import adamik from "./adamik";
import ledger from "./ledger";

export const allAgentSets: AllAgentConfigsType = {
  adamik,
  ledger,
};

export const defaultAgentSetKey = "adamik";
