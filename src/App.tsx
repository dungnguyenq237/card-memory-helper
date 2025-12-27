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
import {
  X,
  RotateCcw,
  Undo2,
  Anchor,
  Wine,
  Music,
  Ship,
  Gem,
  Search,
  Sparkles,
  Compass,
  LucideIcon,
} from "lucide-react";
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

interface CardIcon {
  id: string;
  Icon: LucideIcon;
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
}

interface GridState {
  [cellId: string]: CardIcon;
}

const CARD_ICONS: CardIcon[] = [
  { id: "anchor", Icon: Anchor, color: "bg-pink-500" },
  { id: "wine", Icon: Wine, color: "bg-red-500" },
  { id: "music", Icon: Music, color: "bg-yellow-500" },
  { id: "ship", Icon: Ship, color: "bg-purple-600" },
  { id: "gem", Icon: Gem, color: "bg-green-500" },
  { id: "search", Icon: Search, color: "bg-blue-400" },
  { id: "sparkles", Icon: Sparkles, color: "bg-pink-400" },
  { id: "compass", Icon: Compass, color: "bg-orange-500" },
  { id: "sailboat", Icon: Ship, color: "bg-purple-700" },
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
  Icon: LucideIcon;
  color: string;
}

function DraggableCard({ id, Icon, color }: DraggableCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`${color} rounded-lg p-2 md:p-4 cursor-grab active:cursor-grabbing flex items-center justify-center transition-transform touch-none ${
        isDragging ? "opacity-50 scale-95" : "hover:scale-105"
      }`}
      style={{
        aspectRatio: "3/4",
        touchAction: "none",
        WebkitTouchCallout: "none",
      }}
    >
      <Icon className="w-5 h-5 md:w-8 md:h-8 text-white" strokeWidth={2.5} />
    </div>
  );
}

interface DroppableCellProps {
  id: string;
  card?: CardIcon;
  onRemove: () => void;
}

function DroppableCell({ id, card, onRemove }: DroppableCellProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const [showRemove, setShowRemove] = useState(false);

  return (
    <div
      ref={setNodeRef}
      className={`bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-sm rounded-lg border-2 transition-all relative ${
        isOver
          ? "border-yellow-500 bg-yellow-500/10 shadow-lg shadow-yellow-500/30"
          : "border-gray-700/50"
      }`}
      style={{ aspectRatio: "3/4" }}
      onMouseEnter={() => setShowRemove(true)}
      onMouseLeave={() => setShowRemove(false)}
      onTouchStart={() => setShowRemove(true)}
      onTouchEnd={() => setTimeout(() => setShowRemove(false), 2000)}
    >
      {card && (
        <>
          <div
            className={`${card.color} rounded-lg w-full h-full flex items-center justify-center animate-scaleIn shadow-lg`}
          >
            <card.Icon
              className="w-6 h-6 md:w-8 md:h-8 lg:w-10 lg:h-10 text-white"
              strokeWidth={2.5}
            />
          </div>
          {showRemove && (
            <button
              onClick={onRemove}
              className="absolute -top-2 -right-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 rounded-full p-1 md:p-1.5 transition-all shadow-lg z-10"
            >
              <X className="w-3 h-3 md:w-4 md:h-4 text-black" />
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
  const [history, setHistory] = useState<HistoryAction[]>([]);
  const [showWarning, setShowWarning] = useState<boolean>(false);
  const [pendingLayout, setPendingLayout] = useState<{
    rows: number;
    cols: number;
  } | null>(null);
  const [activeCard, setActiveCard] = useState<CardIcon | null>(null);

  // Configure sensors for better mobile support
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

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const card = CARD_ICONS.find((c) => c.id === event.active.id);
    setActiveCard(card || null);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over) {
        const card = CARD_ICONS.find((c) => c.id === active.id);
        if (card) {
          const cellId = over.id as string;
          const previousCard = grid[cellId];

          setGrid((prev) => ({ ...prev, [cellId]: card }));

          // Track history for undo
          if (previousCard) {
            setHistory((prev) => [
              ...prev,
              { type: "replace", cellId, card, previousCard },
            ]);
          } else {
            setHistory((prev) => [...prev, { type: "add", cellId, card }]);
          }
        }
      }
      setActiveCard(null);
    },
    [grid]
  );

  const handleRemoveCard = useCallback(
    (cellId: string) => {
      const card = grid[cellId];
      if (card) {
        setGrid((prev) => {
          const newGrid = { ...prev };
          delete newGrid[cellId];
          return newGrid;
        });
        setHistory((prev) => [...prev, { type: "remove", cellId, card }]);
      }
    },
    [grid]
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
    } else if (lastAction.type === "remove") {
      setGrid((prev) => ({ ...prev, [lastAction.cellId]: lastAction.card }));
    } else if (lastAction.type === "replace" && lastAction.previousCard) {
      setGrid((prev) => ({
        ...prev,
        [lastAction.cellId]: lastAction.previousCard!,
      }));
    }
    setHistory((prev) => prev.slice(0, -1));
  }, [history]);

  const handleReset = useCallback(() => {
    setGrid({});
    setHistory([]);
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
      setHistory([]);
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
      <div className="min-h-screen bg-linear-to-br from-gray-900 via-black to-yellow-900/20 text-white p-4">
        <div className=" mx-auto space-y-6">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold bg-linear-to-r from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text text-transparent mb-2 drop-shadow-lg">
              Sự Kiện Lật Thẻ Bài
            </h1>
            <p className="text-gray-400 text-sm md:text-base">
              Công cụ hỗ trợ lật thẻ bài
            </p>
          </div>

          {/* Controls */}
          <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-xl p-5 lg:p-6 space-y-4 border border-yellow-500/30 shadow-xl shadow-yellow-500/10">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-end">
              <div className="space-y-1">
                <label className="text-xs text-yellow-400 font-medium">
                  Hàng:
                </label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={rows}
                  onChange={(e) =>
                    handleLayoutChange(parseInt(e.target.value) || 1, cols)
                  }
                  className="bg-gray-900/50 border-yellow-500/30 text-white focus:border-yellow-500 focus:ring-yellow-500/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-yellow-400 font-medium">
                  Cột:
                </label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={cols}
                  onChange={(e) =>
                    handleLayoutChange(rows, parseInt(e.target.value) || 1)
                  }
                  className="bg-gray-900/50 border-yellow-500/30 text-white focus:border-yellow-500 focus:ring-yellow-500/20"
                />
              </div>
              <div className="col-span-2 lg:col-span-2 space-y-1">
                <label className="text-xs text-yellow-400 font-medium lg:block hidden">
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
                  <SelectTrigger className="bg-linear-to-r from-yellow-500 to-yellow-600 border-yellow-600 text-black font-semibold hover:from-yellow-600 hover:to-yellow-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-linear-to-r from-yellow-500 to-yellow-600">
                    {PRESET_LAYOUTS.map((layout) => (
                      <SelectItem
                        className="bg-linear-to-r from-yellow-500 to-yellow-600 border-yellow-600 text-black font-semibold hover:from-yellow-600 hover:to-yellow-700"
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
                className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-semibold shadow-lg shadow-yellow-500/30 disabled:opacity-50 disabled:shadow-none"
              >
                <Undo2 className="w-4 h-4 mr-2" />
                Quay lại
              </Button>
              <Button
                onClick={handleReset}
                variant="outline"
                className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10 hover:text-yellow-300 hover:border-yellow-400"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Xóa
              </Button>
            </div>
          </div>

          {/* Warning Dialog */}
          {showWarning && (
            <Alert className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm border-yellow-500/50 shadow-xl">
              <AlertDescription className="space-y-4">
                <p className="text-white font-medium">
                  Bạn có các thẻ đã đặt. Đổi layout sẽ xóa hết các thẻ này. Bạn
                  có chắc không?
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={confirmLayoutChange}
                    className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-semibold shadow-lg"
                  >
                    Đồng ý
                  </Button>
                  <Button
                    onClick={() => {
                      setShowWarning(false);
                      setPendingLayout(null);
                    }}
                    variant="outline"
                    className="flex-1 border-gray-600 text-white hover:bg-gray-800/50"
                  >
                    Hủy
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Card Pool */}
          <div className="space-y-3">
            <h2 className="text-sm md:text-base font-semibold text-yellow-400">
              Chọn biểu tượng:
            </h2>
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-9 gap-2 md:gap-3 bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm p-3 md:p-4 rounded-xl border border-yellow-500/20">
              {CARD_ICONS.map((card) => (
                <DraggableCard key={card.id} {...card} />
              ))}
            </div>
          </div>

          {/* Grid */}
          <div className="space-y-3 overflow-x-hidden">
            {" "}
            {/* Thêm overflow-x-hidden */}
            <h2 className="text-sm md:text-base font-semibold text-yellow-400">
              Lưới ({rows}×{cols}):
            </h2>
            <div
              className="grid mx-auto"
              style={{
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, // Thêm minmax(0, 1fr)
                gap: cols > 6 ? "4px" : "8px", // Giảm gap khi nhiều cột
                maxWidth: "100%",
                width: "100%",
              }}
            >
              {cells.map((cellId) => (
                <DroppableCell
                  key={cellId}
                  id={cellId}
                  card={grid[cellId]}
                  onRemove={() => handleRemoveCard(cellId)}
                />
              ))}
            </div>
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeCard ? (
            <div
              className={`${activeCard.color} rounded-lg p-4 flex items-center justify-center shadow-2xl opacity-90`}
              style={{ aspectRatio: "3/4", width: "80px" }}
            >
              <activeCard.Icon
                className={`text-white ${
                  cols > 6 ? "w-4 h-4" : "w-6 h-6 md:w-8 md:h-8"
                }`}
                strokeWidth={2.5}
              />
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
