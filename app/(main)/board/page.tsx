import { Suspense } from "react";
import { BoardList } from "@/components/board/board-list";

export default function BoardPage() {
  return (
    <Suspense>
      <BoardList />
    </Suspense>
  );
}
