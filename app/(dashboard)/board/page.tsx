"use client";

import { Board } from "@/components/board/Board";
import { ListView } from "@/components/list/ListView";
import { useStore } from "@/lib/store";

export default function BoardPage() {
  const { boardViewMode } = useStore();
  return boardViewMode === "list" ? <ListView /> : <Board />;
}
