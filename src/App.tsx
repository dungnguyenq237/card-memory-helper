import { useState, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  useDraggable,
  useDroppable,
  DragOverlay,
  TouchSensor,
  MouseSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { X, RotateCcw, Undo2, Lock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

import momoImg from "./assets/momo.jpg";
import techImg from "./assets/tech.jpg";
import anhTrangImg from "./assets/anhtrang.jpg";
import coGaiImg from "./assets/cogai.jpg";
import gioImg from "./assets/gio.jpg";
import matTroiImg from "./assets/mattroi.jpg";
import muaImg from "./assets/mua.jpg";
import nguoiTuyetImg from "./assets/nguoituyet.jpg";
import samSetImg from "./assets/samset.jpg";
import timKiemImg from "./assets/timkiem.jpg";
import xuImg from "./assets/xu.jpg";

interface CardIcon {
  id: string;
  image: string;
  color: string;
}

interface Layout {
  label: string;
  rows: number;
  cols: number;
}

interface HistoryAction {
  type: "add" | "remove" | "replace";
  cellId: string;
  card: CardIcon;
  previousCard?: CardIcon;
  lockedCellId?: string; // ID của ô được lock cùng
  wasLocked?: boolean; // Trạng thái lock trước đó
}

interface GridState {
  [cellId: string]: CardIcon;
}

interface LockedCells {
  [cellId: string]: boolean;
}

const CARD_ICONS: CardIcon[] = [
  { id: "wine", image: xuImg, color: "bg-rose-300" },
  { id: "anchor", image: anhTrangImg, color: "bg-pink-300" },
  { id: "music", image: gioImg, color: "bg-fuchsia-300" },
  { id: "ship", image: muaImg, color: "bg-violet-300" },
  { id: "gem", image: coGaiImg, color: "bg-sky-300" },
  { id: "compass", image: matTroiImg, color: "bg-orange-200" },
  {
    id: "search",
    image: timKiemImg,
    color: "bg-gradient-to-r from-pink-300 to-violet-300",
  },
  {
    id: "sparkles",
    image: samSetImg,
    color: "bg-gradient-to-r from-fuchsia-300 to-sky-300",
  },
  {
    id: "sailboat",
    image: nguoiTuyetImg,
    color: "bg-gradient-to-r from-violet-300 to-rose-300",
  },
];

const PRESET_LAYOUTS: Layout[] = [
  { label: "2×4", rows: 2, cols: 4 },
  { label: "2×5", rows: 2, cols: 5 },
  { label: "2×7", rows: 2, cols: 7 },
  { label: "2×8", rows: 2, cols: 8 },
  { label: "3×4", rows: 3, cols: 4 },
  { label: "3×6", rows: 3, cols: 6 },
  { label: "3×8", rows: 3, cols: 8 },
];

interface DraggableCardProps {
  id: string;
  image: string;
  color: string;
  isSelected: boolean;
  onCardClick: () => void;
}

function DraggableCard({
  id,
  image,
  color,
  isSelected,
  onCardClick,
}: DraggableCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        onCardClick();
      }}
      className={`${color} rounded-lg overflow-hidden cursor-pointer flex items-center justify-center transition-all touch-none relative ${
        isDragging ? "opacity-50 scale-95" : "hover:scale-105"
      } ${
        isSelected
          ? "ring-4 ring-pink-300 ring-offset-2 ring-offset-violet-950 scale-110 shadow-xl shadow-pink-300/50"
          : ""
      }`}
      style={{
        aspectRatio: "3/4",
        touchAction: "none",
        WebkitTouchCallout: "none",
      }}
    >
      <img
        src={image}
        alt=""
        draggable={false}
        className="h-full w-full rounded-md object-cover select-none"
      />
      {isSelected && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-pink-300 rounded-full animate-pulse"></div>
      )}
    </div>
  );
}

interface DroppableCellProps {
  id: string;
  card?: CardIcon;
  onRemove: () => void;
  onCellClick: () => void;
  onDoubleClick: () => void;
  isClickMode: boolean;
  isLocked: boolean;
}

function DroppableCell({
  id,
  card,
  onRemove,
  onCellClick,
  onDoubleClick,
  isClickMode,
  isLocked,
}: DroppableCellProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const [showRemove, setShowRemove] = useState(false);
  const [lastTap, setLastTap] = useState(0);

  const handleTouchEnd = (e: React.TouchEvent) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300; // 300ms

    if (now - lastTap < DOUBLE_TAP_DELAY) {
      e.preventDefault();
      onDoubleClick();
      setLastTap(0);
    } else {
      setLastTap(now);
    }
  };

  return (
    <div
      ref={setNodeRef}
      onClick={onCellClick}
      onDoubleClick={onDoubleClick}
      onTouchEnd={handleTouchEnd}
      className={`bg-gradient-to-br from-white/80 to-pink-50/80 backdrop-blur-sm rounded-lg border-2 transition-all relative shadow-sm ${
        isOver
          ? "border-pink-400 bg-pink-200/45 shadow-lg shadow-pink-300/40"
          : isClickMode && !card
          ? "border-pink-300/70 bg-pink-100/60 cursor-pointer hover:border-pink-400 hover:bg-pink-200/70"
          : "border-violet-200/70"
      } ${
        isLocked
          ? "ring-2 ring-sky-300 ring-offset-1 ring-offset-pink-50"
          : ""
      }`}
      style={{ aspectRatio: "3/4" }}
      onMouseEnter={() => setShowRemove(true)}
      onMouseLeave={() => setShowRemove(false)}
      onTouchStart={() => setShowRemove(true)}
    >
      {card && (
        <>
          <div
            className={`${
              card.color
            } rounded-lg w-full h-full flex items-center justify-center animate-scaleIn shadow-lg ${
              isLocked ? "opacity-80" : ""
            }`}
          >
            <img
              src={card.image}
              alt=""
              draggable={false}
              className="h-full w-full rounded-lg object-cover select-none"
            />
          </div>
          {isLocked && (
            <div className="absolute top-1 right-1 bg-sky-400 rounded-full p-1 shadow-md shadow-sky-300/40">
              <Lock className="w-3 h-3 text-white" />
            </div>
          )}
          {showRemove && !isLocked && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="absolute -top-2 -right-2 bg-gradient-to-r from-pink-400 to-fuchsia-400 hover:from-pink-500 hover:to-fuchsia-500 rounded-full p-1 md:p-1.5 transition-all shadow-lg z-10"
            >
              <X className="w-3 h-3 md:w-4 md:h-4 text-white" />
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default function CardMemoryHelper() {
  const [rows, setRows] = useState<number>(2);
  const [cols, setCols] = useState<number>(4);
  const [grid, setGrid] = useState<GridState>({});
  const [lockedCells, setLockedCells] = useState<LockedCells>({});
  const [history, setHistory] = useState<HistoryAction[]>([]);
  const [showWarning, setShowWarning] = useState<boolean>(false);
  const [pendingLayout, setPendingLayout] = useState<{
    rows: number;
    cols: number;
  } | null>(null);
  const [activeCard, setActiveCard] = useState<CardIcon | null>(null);
  const [selectedCard, setSelectedCard] = useState<CardIcon | null>(null);

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 10,
    },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250,
      tolerance: 5,
    },
  });

  const sensors = useSensors(mouseSensor, touchSensor);

  const hasCards = Object.keys(grid).length > 0;

  const handleCardClick = useCallback((card: CardIcon) => {
    setSelectedCard((prev) => (prev?.id === card.id ? null : card));
  }, []);

  // Tìm ô đầu tiên có cùng loại thẻ (chưa bị lock)
  const findMatchingCard = useCallback(
    (cardId: string, excludeCellId: string) => {
      for (const [cellId, cellCard] of Object.entries(grid)) {
        if (
          cellId !== excludeCellId &&
          cellCard.id === cardId &&
          !lockedCells[cellId]
        ) {
          return cellId;
        }
      }
      return null;
    },
    [grid, lockedCells]
  );

  // Tìm ô có cùng loại thẻ đang bị lock
  const findLockedMatchingCard = useCallback(
    (cardId: string, excludeCellId: string) => {
      for (const [cellId, cellCard] of Object.entries(grid)) {
        if (
          cellId !== excludeCellId &&
          cellCard.id === cardId &&
          lockedCells[cellId]
        ) {
          return cellId;
        }
      }
      return null;
    },
    [grid, lockedCells]
  );

  const handleCellClick = useCallback(
    (cellId: string) => {
      if (!selectedCard) return;
      if (lockedCells[cellId]) return; // Không thể đặt vào ô đã lock

      const previousCard = grid[cellId];

      setGrid((prev) => ({ ...prev, [cellId]: selectedCard }));

      // Nếu là thẻ lock, lock ngay ô này
      if (selectedCard.id === "lock") {
        setLockedCells((prev) => ({ ...prev, [cellId]: true }));
        setHistory((prev) => [
          ...prev,
          {
            type: previousCard ? "replace" : "add",
            cellId,
            card: selectedCard,
            previousCard,
            wasLocked: false,
          },
        ]);
        setSelectedCard(null);
        return;
      }

      // Tìm thẻ matching
      const matchingCellId = findMatchingCard(selectedCard.id, cellId);

      if (matchingCellId) {
        // Lock cả 2 ô
        setLockedCells((prev) => ({
          ...prev,
          [cellId]: true,
          [matchingCellId]: true,
        }));

        setHistory((prev) => [
          ...prev,
          {
            type: previousCard ? "replace" : "add",
            cellId,
            card: selectedCard,
            previousCard,
            lockedCellId: matchingCellId,
            wasLocked: false,
          },
        ]);
      } else {
        // Không có matching, chỉ add bình thường
        setHistory((prev) => [
          ...prev,
          {
            type: previousCard ? "replace" : "add",
            cellId,
            card: selectedCard,
            previousCard,
            wasLocked: false,
          },
        ]);
      }

      setSelectedCard(null);
    },
    [selectedCard, grid, lockedCells, findMatchingCard]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const card = CARD_ICONS.find((c) => c.id === event.active.id);
    setActiveCard(card || null);
    setSelectedCard(null);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over) {
        const card = CARD_ICONS.find((c) => c.id === active.id);
        if (card) {
          const cellId = over.id as string;

          if (lockedCells[cellId]) {
            setActiveCard(null);
            return; // Không thể drop vào ô đã lock
          }

          const previousCard = grid[cellId];

          setGrid((prev) => ({ ...prev, [cellId]: card }));

          // Nếu là thẻ lock, lock ngay ô này
          if (card.id === "lock") {
            setLockedCells((prev) => ({ ...prev, [cellId]: true }));
            setHistory((prev) => [
              ...prev,
              {
                type: previousCard ? "replace" : "add",
                cellId,
                card,
                previousCard,
                wasLocked: false,
              },
            ]);
            setActiveCard(null);
            return;
          }

          // Tìm thẻ matching
          const matchingCellId = findMatchingCard(card.id, cellId);

          if (matchingCellId) {
            // Lock cả 2 ô
            setLockedCells((prev) => ({
              ...prev,
              [cellId]: true,
              [matchingCellId]: true,
            }));

            setHistory((prev) => [
              ...prev,
              {
                type: previousCard ? "replace" : "add",
                cellId,
                card,
                previousCard,
                lockedCellId: matchingCellId,
                wasLocked: false,
              },
            ]);
          } else {
            // Không có matching, chỉ add bình thường
            setHistory((prev) => [
              ...prev,
              {
                type: previousCard ? "replace" : "add",
                cellId,
                card,
                previousCard,
                wasLocked: false,
              },
            ]);
          }
        }
      }
      setActiveCard(null);
    },
    [grid, lockedCells, findMatchingCard]
  );

  const handleRemoveCard = useCallback(
    (cellId: string) => {
      const card = grid[cellId];
      if (card && !lockedCells[cellId]) {
        setGrid((prev) => {
          const newGrid = { ...prev };
          delete newGrid[cellId];
          return newGrid;
        });

        // Tìm và mở khóa thẻ matching đang bị lock (nếu có)
        const lockedMatchingCellId = findLockedMatchingCard(card.id, cellId);
        if (lockedMatchingCellId) {
          setLockedCells((prev) => {
            const newLocked = { ...prev };
            delete newLocked[lockedMatchingCellId];
            return newLocked;
          });
        }

        setHistory((prev) => [
          ...prev,
          {
            type: "remove",
            cellId,
            card,
            wasLocked: false,
            lockedCellId: lockedMatchingCellId || undefined,
          },
        ]);
      }
    },
    [grid, lockedCells, findLockedMatchingCard]
  );

  const handleDoubleClick = useCallback(
    (cellId: string) => {
      if (lockedCells[cellId]) {
        const card = grid[cellId];

        // Mở khóa ô này
        setLockedCells((prev) => {
          const newLocked = { ...prev };
          delete newLocked[cellId];

          // Tìm và mở khóa thẻ matching đang bị lock (nếu có)
          if (card && card.id !== "lock") {
            const lockedMatchingCellId = findLockedMatchingCard(
              card.id,
              cellId
            );
            if (lockedMatchingCellId) {
              delete newLocked[lockedMatchingCellId];
            }
          }

          return newLocked;
        });
      }
    },
    [lockedCells, grid, findLockedMatchingCard]
  );

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;

    const lastAction = history[history.length - 1];

    if (lastAction.type === "add") {
      setGrid((prev) => {
        const newGrid = { ...prev };
        delete newGrid[lastAction.cellId];
        return newGrid;
      });

      // Mở khóa nếu có
      if (lastAction.lockedCellId) {
        setLockedCells((prev) => {
          const newLocked = { ...prev };
          delete newLocked[lastAction.cellId];
          delete newLocked[lastAction.lockedCellId!];
          return newLocked;
        });
      } else if (
        lastAction.card.id === "lock" ||
        lastAction.wasLocked !== undefined
      ) {
        setLockedCells((prev) => {
          const newLocked = { ...prev };
          delete newLocked[lastAction.cellId];
          return newLocked;
        });
      }
    } else if (lastAction.type === "remove") {
      setGrid((prev) => ({ ...prev, [lastAction.cellId]: lastAction.card }));
      if (lastAction.wasLocked) {
        setLockedCells((prev) => ({ ...prev, [lastAction.cellId]: true }));
      }
    } else if (lastAction.type === "replace" && lastAction.previousCard) {
      setGrid((prev) => ({
        ...prev,
        [lastAction.cellId]: lastAction.previousCard!,
      }));

      // Mở khóa nếu có
      if (lastAction.lockedCellId) {
        setLockedCells((prev) => {
          const newLocked = { ...prev };
          delete newLocked[lastAction.cellId];
          delete newLocked[lastAction.lockedCellId!];
          return newLocked;
        });
      } else if (
        lastAction.card.id === "lock" ||
        lastAction.wasLocked !== undefined
      ) {
        setLockedCells((prev) => {
          const newLocked = { ...prev };
          delete newLocked[lastAction.cellId];
          return newLocked;
        });
      }
    }
    setHistory((prev) => prev.slice(0, -1));
  }, [history]);

  const handleReset = useCallback(() => {
    setGrid({});
    setLockedCells({});
    setHistory([]);
    setSelectedCard(null);
  }, []);

  const handleLayoutChange = useCallback(
    (newRows: number, newCols: number) => {
      if (hasCards) {
        setShowWarning(true);
        setPendingLayout({ rows: newRows, cols: newCols });
      } else {
        setRows(newRows);
        setCols(newCols);
      }
    },
    [hasCards]
  );

  const confirmLayoutChange = useCallback(() => {
    if (pendingLayout) {
      setRows(pendingLayout.rows);
      setCols(pendingLayout.cols);
      setGrid({});
      setLockedCells({});
      setHistory([]);
      setSelectedCard(null);
    }
    setShowWarning(false);
    setPendingLayout(null);
  }, [pendingLayout]);

  const totalCells = rows * cols;
  const cells = Array.from({ length: totalCells }, (_, i) => `cell-${i}`);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-linear-to-br from-pink-50 via-violet-50 to-sky-50 text-violet-950 p-4">
        <div className=" mx-auto space-y-6">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold bg-linear-to-r from-fuchsia-500 via-pink-500 to-violet-500 bg-clip-text text-transparent mb-2 drop-shadow-sm">
              Sự Kiện Lật Thẻ Bài
            </h1>
            <p className="text-violet-500 text-sm md:text-base">
              Công cụ hỗ trợ lật thẻ bài
            </p>
            <p className="text-violet-500 text-sm md:text-base">
              Tool này hoàn toàn miễn phí nên các bạn cứ thoải mái dùng.
              <br />
              Nếu bạn thấy tool này hữu ích, ủng hộ mình một ít nếu có thể nhé!
            </p>
            <div className="flex items-center justify-center mt-2 gap-2">
              <img src={momoImg} alt="Momo" className="w-42 md:w-56" />
              <img src={techImg} alt="Tech" className="w-42 md:w-56" />
            </div>
          </div>

          {/* Controls */}
          <div className="bg-linear-to-br from-white/85 to-pink-100/75 backdrop-blur-sm rounded-xl p-5 lg:p-6 space-y-4 border border-pink-200/80 shadow-xl shadow-pink-200/50">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-end">
              <div className="space-y-1">
                <label className="text-xs text-fuchsia-600 font-medium">
                  Hàng:
                </label>
                <Input
                  type="number"
                  max="10"
                  value={rows}
                  onChange={(e) =>
                    handleLayoutChange(parseInt(e.target.value) || 1, cols)
                  }
                  className="bg-white/80 border-pink-200 text-violet-950 focus:border-pink-400 focus:ring-pink-300/30"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-fuchsia-600 font-medium">
                  Cột:
                </label>
                <Input
                  type="number"
                  max="10"
                  value={cols}
                  onChange={(e) =>
                    handleLayoutChange(rows, parseInt(e.target.value) || 1)
                  }
                  className="bg-white/80 border-pink-200 text-violet-950 focus:border-pink-400 focus:ring-pink-300/30"
                />
              </div>
              <div className="col-span-2 lg:col-span-2 space-y-1">
                <label className="text-xs text-fuchsia-600 font-medium lg:block hidden">
                  Layout:
                </label>
                <Select
                  value={`${rows}x${cols}`}
                  onValueChange={(value) => {
                    const layout = PRESET_LAYOUTS.find(
                      (l) => `${l.rows}x${l.cols}` === value
                    );
                    if (layout) handleLayoutChange(layout.rows, layout.cols);
                  }}
                >
                  <SelectTrigger className="bg-linear-to-r from-pink-400 to-violet-400 border-pink-300 text-white font-semibold hover:from-pink-500 hover:to-violet-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-pink-200 text-violet-950">
                    {PRESET_LAYOUTS.map((layout) => (
                      <SelectItem
                        className="text-violet-950 focus:bg-pink-100 focus:text-fuchsia-700"
                        key={layout.label}
                        value={`${layout.rows}x${layout.cols}`}
                      >
                        {layout.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleUndo}
                disabled={history.length === 0}
                className="bg-gradient-to-r from-pink-400 to-fuchsia-400 hover:from-pink-500 hover:to-fuchsia-500 text-white font-semibold shadow-lg shadow-pink-300/40 disabled:opacity-50 disabled:shadow-none"
              >
                <Undo2 className="w-4 h-4 mr-2" />
                Quay lại
              </Button>
              <Button
                onClick={handleReset}
                variant="outline"
                className="border-violet-300/70 bg-white/50 text-violet-600 hover:bg-violet-100/70 hover:text-violet-700 hover:border-violet-400"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Xóa
              </Button>
            </div>
          </div>

          {/* Warning Dialog */}
          {showWarning && (
            <Alert className="bg-gradient-to-br from-white/95 to-pink-100/90 backdrop-blur-sm border-pink-300/70 shadow-xl shadow-pink-200/50">
              <AlertDescription className="space-y-4">
                <p className="text-violet-950 font-medium">
                  Bạn có các thẻ đã đặt. Đổi layout sẽ xóa hết các thẻ này. Bạn
                  có chắc không?
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={confirmLayoutChange}
                    className="flex-1 bg-gradient-to-r from-pink-400 to-fuchsia-400 hover:from-pink-500 hover:to-fuchsia-500 text-white font-semibold shadow-lg"
                  >
                    Đồng ý
                  </Button>
                  <Button
                    onClick={() => {
                      setShowWarning(false);
                      setPendingLayout(null);
                    }}
                    variant="outline"
                    className="flex-1 border-violet-300 text-violet-600 hover:bg-violet-100/70"
                  >
                    Hủy
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Card Pool */}
          <div className="space-y-3">
            <h2 className="text-sm md:text-base font-semibold text-fuchsia-600">
              {selectedCard
                ? "Đã chọn - Click vào ô để đặt thẻ:"
                : "Chọn biểu tượng (Click hoặc Kéo):"}
            </h2>
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-9 gap-2 md:gap-3 bg-gradient-to-br from-white/75 to-violet-100/70 backdrop-blur-sm p-3 md:p-4 rounded-xl border border-pink-200/80 shadow-lg shadow-pink-100/60">
              {CARD_ICONS.map((card) => (
                <DraggableCard
                  key={card.id}
                  {...card}
                  isSelected={selectedCard?.id === card.id}
                  onCardClick={() => handleCardClick(card)}
                />
              ))}
            </div>
          </div>

          {/* Grid */}
          <div className="space-y-3 overflow-x-hidden">
            <h2 className="text-sm md:text-base font-semibold text-fuchsia-600">
              Lưới ({rows}×{cols}):
            </h2>
            <div
              className="grid mx-auto max-w-full md:max-w-[60%]"
              style={{
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                gap: cols > 6 ? "4px" : "8px",
                width: "100%",
              }}
            >
              {cells.map((cellId) => (
                <DroppableCell
                  key={cellId}
                  id={cellId}
                  card={grid[cellId]}
                  onRemove={() => handleRemoveCard(cellId)}
                  onCellClick={() => handleCellClick(cellId)}
                  onDoubleClick={() => handleDoubleClick(cellId)}
                  isClickMode={!!selectedCard}
                  isLocked={!!lockedCells[cellId]}
                />
              ))}
            </div>
            <p className="text-xs md:text-xl text-violet-500 text-center mt-2">
              💡 Mẹo: Double click vào thẻ đã khóa để mở khóa
            </p>
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeCard ? (
            <div
              className={`${activeCard.color} rounded-lg overflow-hidden flex items-center justify-center shadow-2xl opacity-90`}
              style={{ aspectRatio: "3/4", width: "80px" }}
            >
              <img
                src={activeCard.image}
                alt=""
                draggable={false}
                className="h-full w-full rounded-md object-cover select-none"
              />
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
