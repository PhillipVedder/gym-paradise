'use client';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Camera,
  Check,
  CheckCheck,
  ChevronDown,
  CircleHelp,
  Copy,
  Download,
  Dumbbell,
  Expand,
  Footprints,
  Hand,
  Orbit,
  Grid2X2,
  Layers3,
  LoaderCircle,
  Minus,
  Move,
  Paintbrush,
  Plus,
  Redo2,
  RotateCcw,
  RotateCw,
  Search,
  Share2,
  Trash2,
  Undo2,
  Upload,
  X,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  GymCustomizer,
  MachineFinishDialog,
} from '@/components/gym-customizer';
import { roomSize } from '@/lib/gym-design';
import { EXAMPLE_LAYOUT } from '@/lib/gym-example';
import { GymExampleDialog } from '@/components/gym-example-dialog';
import {
  CATALOG,
  DEFAULT_LAYOUT,
  EQUIPMENT,
  MAX_ITEMS,
  canPlace,
  validateLayout,
  type Category,
  type EquipmentKind,
  type GymLayout,
  type Mode,
  type PlacedItem,
} from '@/lib/gym-data';
import { useGymStorage } from '@/hooks/use-gym-storage';
import { GymFeatures } from '@/components/gym-features';
import { normaliseImage, uploadImage } from '@/lib/media-client';
import {
  portableLayout,
  validateState,
  type GymState,
  type CollectionItem,
} from '@/lib/gym-records';
import type { GymSceneApi, PlacementPreview } from '@/lib/gym-scene';
import type { BuildTool } from '@/lib/gym-camera';
const categories: Category[] = [
  'All equipment',
  'Machines',
  'Cables',
  'Free weights',
  'Cardio',
  'Functional',
];
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export default function GymApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null),
    api = useRef<GymSceneApi | null>(null);
  const [layout, setLayout] = useState<GymLayout>(() =>
    structuredClone(DEFAULT_LAYOUT),
  );
  const latest = useRef(layout);
  const [mode, setMode] = useState<Mode>('build');
  const modeRef = useRef(mode);
  const [buildTool, setBuildTool] = useState<BuildTool>('orbit');
  const [placement, setPlacement] = useState<PlacementPreview | null>(null);
  const [draggingItem, setDraggingItem] = useState(false);
  const [trashHover, setTrashHover] = useState(false);
  const trashRef = useRef<HTMLButtonElement>(null);
  const catalogueDrag = useRef<{
    pointerId: number;
    kind: EquipmentKind;
    x: number;
    y: number;
    active: boolean;
  } | null>(null);
  const suppressClickUntil = useRef(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [category, setCategory] = useState<Category>('All equipment');
  const [search, setSearch] = useState('');
  const [panel, setPanel] = useState<'equipment' | 'style'>('equipment');
  const [customizerExpanded, setCustomizerExpanded] = useState(false);
  const [ceilingVisible, setCeilingVisible] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [exampleOpen, setExampleOpen] = useState(false);
  const [ready, setReady] = useState(false),
    [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [featuresOpen, setFeaturesOpen] = useState(false),
    [featureTab, setFeatureTab] = useState<
      'collection' | 'progress' | 'research'
    >('collection'),
    [inspectId, setInspectId] = useState<string | null>(null),
    [artBusy, setArtBusy] = useState(false);
  const [recording, setRecording] = useState(false),
    [recordSeconds, setRecordSeconds] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null),
    recordTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [shareOpen, setShareOpen] = useState(false),
    [helpOpen, setHelpOpen] = useState(false),
    [renameOpen, setRenameOpen] = useState(false),
    [resetOpen, setResetOpen] = useState(false);
  const [draftName, setDraftName] = useState(layout.name),
    [cleanView, setCleanView] = useState(false),
    [capturing, setCapturing] = useState(false);
  const [privateImport, setPrivateImport] = useState<GymState | null>(null);
  const [importDraft, setImportDraft] = useState<GymLayout | null>(null);
  const [historySize, setHistorySize] = useState({ past: 0, future: 0 });
  const history = useRef<{ past: GymLayout[]; future: GymLayout[] }>({
    past: [],
    future: [],
  });
  const [joystick, setJoystick] = useState({ x: 0, y: 0 });
  const joystickId = useRef<number | null>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const notify = useCallback(
    (message: string) => setNotice(message),
    [setNotice],
  );
  const storage = useGymStorage((state) => {
    latest.current = state.layout;
    setLayout(state.layout);
    history.current = { past: [], future: [] };
    setHistorySize({ past: 0, future: 0 });
    setSelected(null);
  });
  const saveStatus = storage.status;
  const persist = storage.persistLayout;
  const dataReady = useRef(false);
  useEffect(() => {
    dataReady.current = storage.loaded;
  }, [storage.loaded]);
  const commit = useCallback(
    (next: GymLayout) => {
      if (!api.current || !dataReady.current) {
        notify('Your gym is still opening. Try again in a moment.');
        return false;
      }
      try {
        next = validateLayout(next);
      } catch (e) {
        notify(
          e instanceof Error ? e.message : 'This change could not be applied.',
        );
        return false;
      }
      if (JSON.stringify(next) === JSON.stringify(latest.current)) return true;
      history.current.past = [
        ...history.current.past,
        structuredClone(latest.current),
      ].slice(-35);
      history.current.future = [];
      latest.current = next;
      setLayout(next);
      persist(next);
      setHistorySize({ past: history.current.past.length, future: 0 });
      return true;
    },
    [notify, persist, setHistorySize, setLayout],
  );
  const move = useCallback(
    (id: string, x: number, z: number) => {
      const current = latest.current;
      const item = current.items.find((i) => i.id === id);
      if (!item || (item.x === x && item.z === z)) return;
      const moved = { ...item, x, z };
      if (!canPlace(moved, current.items, roomSize(current))) {
        notify('Leave a little space around each machine.');
        return;
      }
      commit({
        ...current,
        items: current.items.map((i) => (i.id === id ? moved : i)),
      });
    },
    [commit, notify],
  );

  const place = useCallback(
    (draft: PlacedItem) => {
      const current = latest.current;
      if (
        !canPlace(draft, current.items, roomSize(current)) ||
        current.items.length >= MAX_ITEMS
      )
        return false;
      const saved = commit({ ...current, items: [...current.items, draft] });
      if (saved) {
        setSelected(draft.id);
        notify(`${EQUIPMENT[draft.kind].name} placed`);
      }
      return saved;
    },
    [commit, notify, setSelected],
  );
  const deletePlaced = useCallback(
    (id: string) => {
      if (
        commit({
          ...latest.current,
          items: latest.current.items.filter((i) => i.id !== id),
        })
      ) {
        setSelected(null);
        notify('Equipment removed. Undo brings it back.');
      }
    },
    [commit, notify, setSelected],
  );
  const isOverTrash = useCallback((x: number, y: number) => {
    const r = trashRef.current?.getBoundingClientRect();
    return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }, []);

  useEffect(() => {
    let cancelled = false;
    import('@/lib/gym-scene')
      .then(({ createGymScene }) => {
        if (cancelled || !canvasRef.current) return;
        const instance = createGymScene(canvasRef.current, {
          onSelect: setSelected,
          onPlace: place,
          onPlacementChange: setPlacement,
          onDragChange: setDraggingItem,
          onTrashHover: setTrashHover,
          isOverTrash,
          onDelete: deletePlaced,
          onMove: move,
          onInspect: (id) => {
            setInspectId(id);
            setFeatureTab('progress');
            setFeaturesOpen(true);
          },
          onReady: () => {
            if (!cancelled) setReady(true);
          },
        });
        if (cancelled) {
          instance.dispose();
          return;
        }
        api.current = instance;
        instance.setLayout(latest.current);
        instance.setMode(modeRef.current);
      })
      .catch(() => {
        if (!cancelled)
          setError(
            'The 3D view could not start. Try reopening this page in an up-to-date Safari or Chrome browser.',
          );
      });
    return () => {
      cancelled = true;
      api.current?.dispose();
      api.current = null;
    };
  }, [move, place, deletePlaced, isOverTrash]);
  useEffect(() => {
    api.current?.setLayout(layout);
  }, [layout]);
  useEffect(() => {
    if (modeRef.current !== mode) {
      modeRef.current = mode;
      api.current?.setMode(mode);
    }
  }, [mode]);
  useEffect(() => {
    api.current?.setBuildTool(buildTool);
  }, [buildTool]);
  useEffect(() => {
    if (!storage.loaded) api.current?.cancelPlacement();
  }, [storage.loaded]);
  useEffect(() => {
    api.current?.select(selected);
  }, [selected]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 5000);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    if (!cleanView) return;
    const escape = (e: KeyboardEvent) => {
      if (e.code === 'Escape') setCleanView(false);
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [cleanView]);
  const item = layout.items.find((i) => i.id === selected);
  const visible = CATALOG.filter(
    (e) =>
      (category === 'All equipment' || e.category === category) &&
      `${e.name} ${e.detail}`.toLowerCase().includes(search.toLowerCase()),
  );
  function add(
    kind: EquipmentKind,
    collectionId?: string,
    finishes?: Pick<PlacedItem, 'frameColor' | 'upholsteryColor'>,
  ) {
    if (!ready || !storage.loaded) return false;
    if (latest.current.items.length >= MAX_ITEMS) {
      notify('Your room supports up to 40 pieces. Remove one to add another.');
      return false;
    }
    if (modeRef.current !== 'build') {
      modeRef.current = 'build';
      api.current?.setMode('build');
      setMode('build');
    }
    setSelected(null);
    setPanel('equipment');
    setFeaturesOpen(false);
    return (
      api.current?.startPlacement(kind, {
        ...finishes,
        ...(collectionId ? { collectionId } : {}),
      }) || false
    );
  }
  function catalogueDown(
    e: ReactPointerEvent<HTMLButtonElement>,
    kind: EquipmentKind,
  ) {
    if (e.button !== 0) return;
    catalogueDrag.current = {
      pointerId: e.pointerId,
      kind,
      x: e.clientX,
      y: e.clientY,
      active: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function catalogueMove(e: ReactPointerEvent<HTMLButtonElement>) {
    const drag = catalogueDrag.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = Math.abs(e.clientX - drag.x),
      dy = Math.abs(e.clientY - drag.y);
    if (!drag.active && Math.hypot(dx, dy) > 8) {
      // Horizontal swipes still scroll the phone catalogue; drag upward to place a piece.
      if (e.pointerType === 'touch' && window.innerWidth <= 760 && dx > dy)
        return;
      if (!add(drag.kind)) {
        catalogueDrag.current = null;
        return;
      }
      drag.active = true;
    }
    if (drag.active) {
      e.preventDefault();
      api.current?.updatePlacement(e.clientX, e.clientY);
    }
  }
  function catalogueUp(e: ReactPointerEvent<HTMLButtonElement>) {
    const drag = catalogueDrag.current;
    if (drag?.pointerId === e.pointerId && drag.active) {
      suppressClickUntil.current = performance.now() + 500;
      api.current?.updatePlacement(e.clientX, e.clientY);
      const rect = canvasRef.current?.getBoundingClientRect();
      const inside =
        !!rect &&
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      if (isOverTrash(e.clientX, e.clientY) || !inside)
        api.current?.cancelPlacement();
      else api.current?.confirmPlacement();
    }
    catalogueDrag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
  }
  function catalogueCancel(e: ReactPointerEvent<HTMLButtonElement>) {
    if (catalogueDrag.current?.active) api.current?.cancelPlacement();
    catalogueDrag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
  }
  function rotate() {
    if (!item) return;
    const rotated = {
      ...item,
      rotation: (item.rotation + Math.PI / 2) % (Math.PI * 2),
    };
    if (!canPlace(rotated, layout.items, roomSize(layout))) {
      notify('Move this piece into a clearer space before rotating.');
      return;
    }
    commit({
      ...layout,
      items: layout.items.map((i) => (i.id === item.id ? rotated : i)),
    });
  }
  function duplicate() {
    if (item)
      add(item.kind, item.collectionId, {
        frameColor: item.frameColor,
        upholsteryColor: item.upholsteryColor,
      });
  }
  function remove() {
    if (!item) return;
    commit({ ...layout, items: layout.items.filter((i) => i.id !== item.id) });
    setSelected(null);
    notify('Equipment removed. Use Undo to bring it back.');
  }
  function undo() {
    const previous = history.current.past.pop();
    if (!previous) return;
    history.current.future.push(structuredClone(latest.current));
    latest.current = previous;
    setLayout(previous);
    persist(previous);
    setSelected(null);
    setHistorySize({
      past: history.current.past.length,
      future: history.current.future.length,
    });
  }
  function redo() {
    const next = history.current.future.pop();
    if (!next) return;
    history.current.past.push(structuredClone(latest.current));
    latest.current = next;
    setLayout(next);
    persist(next);
    setSelected(null);
    setHistorySize({
      past: history.current.past.length,
      future: history.current.future.length,
    });
  }
  async function readImport(file?: File) {
    if (!file) return;
    try {
      if (file.size > 2_000_000)
        throw new Error('Choose a backup smaller than 2 MB.');
      const value = JSON.parse(await file.text());
      if (value?.layout) {
        const draft = validateState(value);
        const required = [
          draft.layout.muralId,
          ...draft.collection.map((c) => c.photoId),
        ].filter(Boolean);
        if (required.length) {
          const response = await fetch('/api/media');
          if (!response.ok)
            throw new Error('Connect to your account before restoring photos.');
          const media = (await response.json()) as { ids: string[] };
          const owned = new Set(media.ids);
          if (required.some((id) => !id || !owned.has(id)))
            throw new Error(
              'This private backup references photos from another account or photos that are unavailable. Restore it in the original account.',
            );
        }
        setPrivateImport(draft);
      } else setImportDraft(validateLayout(value));
    } catch (err) {
      notify(
        err instanceof Error ? err.message : 'This layout could not be opened.',
      );
    }
    if (importInput.current) importInput.current.value = '';
  }
  function exportLayout() {
    download(
      new Blob([JSON.stringify(portableLayout(layout), null, 2)], {
        type: 'application/json',
      }),
      'gym-paradise.json',
    );
    notify(
      'Layout exported. Private photos, wishlist details and workout records are excluded.',
    );
  }
  async function capture() {
    setCapturing(true);
    try {
      const blob = await api.current?.capture();
      if (!blob) throw new Error();
      download(blob, 'my-dream-gym.png');
      notify('Gym photo saved. On iPhone, check Downloads in Files.');
    } catch {
      notify(
        'Could not save a photo. You can use your device screenshot instead.',
      );
    } finally {
      setCapturing(false);
    }
  }
  function startTour() {
    setShareOpen(false);
    setMode('explore');
    setSelected(null);
    setCleanView(true);
    notify('Walk through your gym. Use Record tour to save a video.');
  }
  async function startRecording() {
    if (!canvasRef.current || recording) return;
    if (
      !canvasRef.current.captureStream ||
      typeof MediaRecorder === 'undefined'
    ) {
      notify(
        'Video recording is unavailable in this browser. Use your iPhone screen recorder in tour view.',
      );
      return;
    }
    const mime = [
      'video/mp4;codecs=avc1.42E01E',
      'video/mp4',
      'video/webm;codecs=vp9',
      'video/webm',
    ].find((t) => MediaRecorder.isTypeSupported(t));
    if (!mime) {
      notify('Use your device screen recorder to capture a tour.');
      return;
    }
    let stream: MediaStream | null = null;
    try {
      stream = canvasRef.current.captureStream(30);
      const r = new MediaRecorder(stream, {
          mimeType: mime,
          videoBitsPerSecond: 4_000_000,
        }),
        chunks: BlobPart[] = [];
      recorder.current = r;
      r.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      r.onstop = () => {
        stream?.getTracks().forEach((t) => t.stop());
        if (recordTimer.current) clearInterval(recordTimer.current);
        setRecording(false);
        recorder.current = null;
        if (chunks.length) {
          download(
            new Blob(chunks, { type: mime }),
            `my-dream-gym-tour.${mime.includes('mp4') ? 'mp4' : 'webm'}`,
          );
          notify('Tour video saved. On iPhone, check Downloads in Files.');
        }
      };
      r.onerror = () => {
        notify('Recording stopped. Try your device screen recorder.');
        if (r.state !== 'inactive') r.stop();
      };
      setShareOpen(false);
      setMode('explore');
      setCleanView(true);
      setRecordSeconds(0);
      setRecording(true);
      r.start(1000);
      let seconds = 0;
      recordTimer.current = setInterval(() => {
        seconds++;
        setRecordSeconds(seconds);
        if (seconds >= 60 && r.state === 'recording') r.stop();
      }, 1000);
    } catch {
      stream?.getTracks().forEach((t) => t.stop());
      recorder.current = null;
      setRecording(false);
      if (recordTimer.current) clearInterval(recordTimer.current);
      notify('Could not start recording. Try your device screen recorder.');
    }
  }
  useEffect(
    () => () => {
      if (recordTimer.current) clearInterval(recordTimer.current);
      if (recorder.current?.state === 'recording') recorder.current.stop();
    },
    [],
  );
  async function wallArt(file?: File) {
    if (!file) return;
    setArtBusy(true);
    try {
      const blob = await normaliseImage(file),
        id = await uploadImage(blob);
      commit({ ...latest.current, mural: true, muralId: id });
      notify('Your artwork is on the statement wall.');
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not upload wall art.');
    } finally {
      setArtBusy(false);
    }
  }
  function openFeatures(tab: 'collection' | 'progress' | 'research') {
    setFeatureTab(tab);
    setInspectId(selected);
    setFeaturesOpen(true);
  }
  function placeCollection(c: CollectionItem) {
    add(c.kind, c.id);
  }

  function updateJoystick(e: ReactPointerEvent<HTMLElement>) {
    if (joystickId.current !== e.pointerId) return;
    const r = e.currentTarget.getBoundingClientRect();
    let x = (e.clientX - r.left - r.width / 2) / 36,
      y = (e.clientY - r.top - r.height / 2) / 36;
    const len = Math.max(1, Math.hypot(x, y));
    x /= len;
    y /= len;
    setJoystick({ x, y });
    api.current?.joystick(x, y);
  }
  function stopJoystick(e: ReactPointerEvent<HTMLElement>) {
    if (joystickId.current !== e.pointerId) return;
    joystickId.current = null;
    setJoystick({ x: 0, y: 0 });
    api.current?.joystick(0, 0);
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
  }
  const modeControls = (
    <fieldset className="mode-controls" aria-label="Gym view">
      <button
        className={mode === 'build' ? 'active' : ''}
        onClick={() => {
          setMode('build');
          setCleanView(false);
          setCeilingVisible(false);
          api.current?.setCeilingVisible(false);
        }}
        aria-pressed={mode === 'build'}
      >
        <Grid2X2 size={17} />
        Build
      </button>
      <button
        className={mode === 'explore' ? 'active' : ''}
        onClick={() => setMode('explore')}
        aria-pressed={mode === 'explore'}
      >
        <Footprints size={17} />
        Explore
      </button>
    </fieldset>
  );
  return (
    <main
      className={`gym-shell ${mode} ${customizerExpanded ? 'customizer-expanded' : ''} ${cleanView ? 'clean-view' : ''}`}
    >
      <MachineFinishDialog
        item={item}
        layout={layout}
        onChange={commit}
        open={finishOpen}
        onOpenChange={setFinishOpen}
      />
      <header className="topbar">
        <div className="brand">
          <span className="brand-symbol">
            <Dumbbell size={22} />
          </span>
          <strong>
            GYM<span>PARADISE</span>
          </strong>
          <span className="prototype-badge">EARLY ACCESS</span>
        </div>
        <button
          className="gym-name"
          onClick={() => {
            setDraftName(layout.name);
            setRenameOpen(true);
          }}
          aria-label={`Rename ${layout.name}`}
        >
          {layout.name}
          <ChevronDown size={14} />
        </button>
        <div className="top-actions">
          <span className="save-state">
            <span />
            {saveStatus}
          </span>
          <button
            className="icon-button help-top"
            onClick={() => setHelpOpen(true)}
            aria-label="Controls and help"
          >
            <CircleHelp size={19} />
          </button>
          <button className="share-button" onClick={() => setShareOpen(true)}>
            <Share2 size={16} />
            <span>Share gym</span>
          </button>
        </div>
      </header>
      <div className="workspace">
        <aside className="library" aria-label="Gym customisation">
          <div className="library-heading">
            <span className="eyebrow">MAKE ROOM FOR YOUR AMBITION</span>
            <h1>Your gym. Your rules.</h1>
            <p>Build a place that feels like you.</p>
          </div>
          <div className="personal-tools">
            <button
              onClick={() => openFeatures('collection')}
              disabled={!storage.loaded}
            >
              <Camera size={16} />
              Collect a machine
            </button>
            <button
              onClick={() => openFeatures('progress')}
              disabled={!storage.loaded}
            >
              <Dumbbell size={16} />
              Training
            </button>
          </div>
          <Tabs
            value={panel}
            onValueChange={(value) => {
              api.current?.cancelPlacement();
              setPanel(value as 'equipment' | 'style');
              setCustomizerExpanded(false);
            }}
            className="library-tabs"
          >
            <TabsList className="library-tab-list">
              <TabsTrigger value="equipment">
                <Dumbbell size={16} />
                Equipment
              </TabsTrigger>
              <TabsTrigger value="style">
                <Paintbrush size={16} />
                Customise
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {panel === 'equipment' ? (
            <>
              <button
                className="example-launch"
                onClick={() => {
                  api.current?.cancelPlacement();
                  setExampleOpen(true);
                }}
              >
                <Grid2X2 size={17} />
                <span>Example gym</span>
                <small>All {CATALOG.length} types</small>
                <ArrowUpRight size={16} />
              </button>
              <label className="search-field">
                <Search size={17} />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Find your next favourite"
                  aria-label="Search equipment"
                />
              </label>
              <fieldset
                className="category-pills"
                aria-label="Equipment categories"
              >
                {categories.map((c) => (
                  <button
                    key={c}
                    className={category === c ? 'chosen' : ''}
                    onClick={() => setCategory(c)}
                    aria-pressed={category === c}
                  >
                    {c}
                  </button>
                ))}
              </fieldset>
              <div className="catalogue-label">
                <span>{visible.length} pieces to make it yours</span>
                <button onClick={() => openFeatures('research')}>
                  Research ↗
                </button>
              </div>
              <p id="placement-instructions" className="placement-instructions">
                Drag a piece into your gym, or tap to preview and place.
              </p>
              <div className="equipment-list">
                {visible.map((e) => (
                  <button
                    key={e.kind}
                    className={`equipment-card ${item?.kind === e.kind ? 'selected-kind' : ''}`}
                    onPointerDown={(event) => catalogueDown(event, e.kind)}
                    onPointerMove={catalogueMove}
                    onPointerUp={catalogueUp}
                    onPointerCancel={catalogueCancel}
                    onClick={() => {
                      if (performance.now() >= suppressClickUntil.current)
                        add(e.kind);
                    }}
                    disabled={
                      !ready ||
                      !storage.loaded ||
                      layout.items.length >= MAX_ITEMS
                    }
                    aria-label={`Preview ${e.name}`}
                    aria-describedby="placement-instructions"
                  >
                    <div className={`equipment-icon kind-${e.kind}`}>
                      <Dumbbell size={28} strokeWidth={1.1} />
                      <span>
                        {String(
                          CATALOG.findIndex((x) => x.kind === e.kind) + 1,
                        ).padStart(2, '0')}
                      </span>
                    </div>
                    <div className="equipment-copy">
                      <span className="equipment-tag">{e.tag}</span>
                      <strong>{e.name}</strong>
                      <span className="equipment-detail">{e.detail}</span>
                    </div>
                    <span className="add-piece">
                      <Plus size={17} />
                    </span>
                  </button>
                ))}
                {!visible.length && (
                  <div className="empty-search">
                    <Search />
                    <strong>No equipment found</strong>
                    <p>Try “bench”, “cable”, or “press”.</p>
                    <button
                      onClick={() => {
                        setSearch('');
                        setCategory('All equipment');
                      }}
                    >
                      Clear search
                    </button>
                  </div>
                )}
              </div>
              <div className="library-footnote">
                <Layers3 size={15} />
                <p>
                  {CATALOG.length} original approximate models.
                  <br />
                  <button onClick={() => openFeatures('research')}>
                    Inspired by real gym research ↗
                  </button>
                </p>
              </div>
            </>
          ) : (
            <GymCustomizer
              layout={layout}
              onChange={commit}
              enabled={storage.loaded && ready}
              artBusy={artBusy}
              uploadArt={(file) => void wallArt(file)}
              expanded={customizerExpanded}
              onExpand={() => setCustomizerExpanded((v) => !v)}
              ceilingVisible={ceilingVisible}
              onCeiling={(v) => {
                setCeilingVisible(v);
                api.current?.setCeilingVisible(v);
              }}
              explore={() => {
                setMode('explore');
                setCustomizerExpanded(false);
              }}
            />
          )}
        </aside>
        <section
          className={`viewport tool-${buildTool} ${placement ? 'placing' : ''}`}
          aria-label="Interactive gym"
        >
          <canvas
            ref={canvasRef}
            style={{ pointerEvents: storage.loaded ? 'auto' : 'none' }}
            tabIndex={0}
            aria-label="3D gym. In Build, choose Orbit or Pan, or drag equipment to move it. Preview a library piece, choose a clear floor position, then Place. Arrow keys adjust a preview, R rotates it and Escape cancels. In Explore, use WASD or the movement control. Equipment can also be selected using the Room list."
          />
          {!ready && !error && (
            <div className="loading">
              <span className="loading-mark">
                <Dumbbell size={34} />
              </span>
              <strong>Opening your gym</strong>
              <p>A little space. A lot of possibility.</p>
              <LoaderCircle className="spin" size={19} />
            </div>
          )}
          {error && (
            <div className="loading error-state">
              <CircleHelp size={32} />
              <strong>Let’s get you back inside.</strong>
              <p>{error}</p>
              <button onClick={() => location.reload()}>Try again</button>
            </div>
          )}
          <div className="scene-top">
            <div className="scene-heading">
              <span className="eyebrow">YOUR GYM</span>
              <span>
                {roomSize(layout).width} × {roomSize(layout).depth} m{' '}
                <span className="dot-separator">·</span> {layout.items.length}{' '}
                pieces
              </span>
            </div>
            {modeControls}
            <div className="scene-tools">
              <button
                className="icon-button"
                aria-label="Undo last change"
                onClick={undo}
                disabled={!storage.loaded || !historySize.past}
              >
                <Undo2 size={18} />
              </button>
              <button
                className="icon-button"
                aria-label="Redo last change"
                onClick={redo}
                disabled={!storage.loaded || !historySize.future}
              >
                <Redo2 size={18} />
              </button>
              <span className="tool-separator" />
              <button
                className="icon-button"
                aria-label="Reset camera view"
                onClick={() => api.current?.resetView()}
              >
                <Expand size={18} />
              </button>
            </div>
          </div>
          <div className="view-label">
            <span className="live-dot" />
            {mode === 'build'
              ? 'BUILD YOUR PARADISE'
              : 'STEP INSIDE YOUR PARADISE'}
          </div>
          {mode === 'explore' && !cleanView && (
            <button
              className="training-shortcut"
              onClick={() => openFeatures('progress')}
            >
              Training log <Dumbbell size={16} />
            </button>
          )}
          {mode === 'build' && (
            <fieldset
              className="camera-tools"
              aria-label="Build camera controls"
            >
              <button
                className={buildTool === 'orbit' ? 'active' : ''}
                aria-pressed={buildTool === 'orbit'}
                onClick={() => setBuildTool('orbit')}
              >
                <Orbit size={16} />
                Orbit
              </button>
              <button
                className={buildTool === 'pan' ? 'active' : ''}
                aria-pressed={buildTool === 'pan'}
                onClick={() => setBuildTool('pan')}
              >
                <Hand size={16} />
                Pan
              </button>
            </fieldset>
          )}
          {mode === 'build' && placement && (
            <div className="placement-toolbar">
              <div>
                <strong>{EQUIPMENT[placement.item.kind].name}</strong>
                <output>
                  {placement.valid
                    ? 'Ready to place'
                    : placement.inside
                      ? 'Leave space around the machine'
                      : 'Move onto the gym floor'}
                </output>
              </div>
              <div className="placement-buttons">
                <button
                  onClick={() => api.current?.rotatePlacement()}
                  aria-label="Rotate preview 90 degrees"
                >
                  <RotateCw size={17} />
                  <span>Rotate</span>
                </button>
                <button
                  className="confirm-placement"
                  disabled={!placement.valid}
                  onClick={() => api.current?.confirmPlacement()}
                >
                  <Check size={17} />
                  Place
                </button>
                <button
                  onClick={() => api.current?.cancelPlacement()}
                  aria-label="Cancel placement"
                >
                  <X size={17} />
                </button>
              </div>
            </div>
          )}
          {mode === 'build' && (placement || draggingItem) && (
            <button
              ref={trashRef}
              className={`trash-drop ${trashHover ? 'over' : ''}`}
              onClick={() => api.current?.cancelPlacement()}
              aria-label={
                placement ? 'Discard preview' : 'Drop equipment here to delete'
              }
            >
              <Trash2 size={22} />
              <span>{placement ? 'Drop to discard' : 'Drop to delete'}</span>
            </button>
          )}
          {mode === 'build' && (
            <div className="zoom-controls">
              <button
                className="icon-button"
                onClick={() => api.current?.zoom(-3)}
                aria-label="Zoom in"
              >
                <Plus size={18} />
              </button>
              <button
                className="icon-button"
                onClick={() => api.current?.zoom(3)}
                aria-label="Zoom out"
              >
                <Minus size={18} />
              </button>
            </div>
          )}
          {mode === 'build' && item && !placement && !draggingItem && (
            <div className="selection-card">
              <div>
                <span className="eyebrow">SELECTED EQUIPMENT</span>
                <strong>{EQUIPMENT[item.kind].name}</strong>
                <small>
                  {item.collectionId
                    ? storage.data.collection.find(
                        (c) => c.id === item.collectionId,
                      )?.name + ' · similar model'
                    : 'Approximate model · drag to reposition'}
                </small>
              </div>
              <div className="selection-actions">
                <button
                  onClick={() => setFinishOpen(true)}
                  aria-label="Customise selected equipment colours"
                >
                  <Paintbrush size={17} />
                </button>
                <button
                  onClick={() => openFeatures('progress')}
                  aria-label="Open training log for selected machine"
                >
                  <Dumbbell size={17} />
                </button>
                <button
                  onClick={rotate}
                  aria-label="Rotate selected equipment 90 degrees"
                >
                  <RotateCw size={17} />
                  <span>Rotate</span>
                </button>
                <button
                  onClick={duplicate}
                  aria-label="Duplicate selected equipment"
                >
                  <Copy size={17} />
                </button>
                <button onClick={remove} aria-label="Remove selected equipment">
                  <Trash2 size={17} />
                </button>
                <button
                  onClick={() => setSelected(null)}
                  aria-label="Deselect equipment"
                >
                  <X size={17} />
                </button>
              </div>
              <fieldset
                className="nudge-controls"
                aria-label="Move selected equipment in half metre steps"
              >
                <span>Move</span>
                <button
                  onClick={() => move(item.id, item.x - 0.5, item.z)}
                  aria-label="Move left"
                >
                  <ArrowLeft size={15} />
                </button>
                <button
                  onClick={() => move(item.id, item.x, item.z + 0.5)}
                  aria-label="Move forward"
                >
                  <ArrowUp size={15} />
                </button>
                <button
                  onClick={() => move(item.id, item.x, item.z - 0.5)}
                  aria-label="Move backward"
                >
                  <ArrowDown size={15} />
                </button>
                <button
                  onClick={() => move(item.id, item.x + 0.5, item.z)}
                  aria-label="Move right"
                >
                  <ArrowRight size={15} />
                </button>
              </fieldset>
            </div>
          )}
          {mode === 'explore' && (
            <>
              <fieldset
                className="joystick"
                aria-label="Movement control"
                onPointerDown={(e) => {
                  joystickId.current = e.pointerId;
                  e.currentTarget.setPointerCapture(e.pointerId);
                  updateJoystick(e);
                }}
                onPointerMove={updateJoystick}
                onPointerUp={stopJoystick}
                onPointerCancel={stopJoystick}
              >
                <span className="joystick-ring" />
                <span
                  className="joystick-nub"
                  style={{
                    transform: `translate(${joystick.x * 30}px,${joystick.y * 30}px)`,
                  }}
                />
                <ArrowUp className="joystick-up" size={15} />
                <ArrowDown className="joystick-down" size={15} />
                <ArrowLeft className="joystick-left" size={15} />
                <ArrowRight className="joystick-right" size={15} />
              </fieldset>
              <button
                className="photo-button"
                onClick={capture}
                disabled={capturing || !ready}
                aria-label="Save a photo of your gym"
              >
                {capturing ? (
                  <LoaderCircle className="spin" />
                ) : (
                  <Camera size={23} />
                )}
              </button>
            </>
          )}
          <div className="scene-bottom">
            <span className="controls-hint">
              <Move size={15} />
              {mode === 'build' ? (
                <>
                  <span className="desktop-hint">
                    Orbit / Pan · right-drag or Space-drag to pan · scroll to
                    zoom
                  </span>
                  <span className="mobile-hint">
                    Orbit / Pan · two fingers to pan and zoom
                  </span>
                </>
              ) : (
                <>
                  <span className="desktop-hint">
                    W A S D to walk · drag to look around
                  </span>
                  <span className="mobile-hint">
                    Thumbstick to walk · swipe to look
                  </span>
                </>
              )}
            </span>
            <button
              className="enter-gym"
              onClick={() =>
                mode === 'build' ? setMode('explore') : setShareOpen(true)
              }
            >
              {mode === 'build' ? (
                <>
                  <Footprints size={17} />
                  Step inside
                  <ArrowUpRight size={17} />
                </>
              ) : (
                <>
                  <Camera size={17} />
                  Share your view
                </>
              )}
            </button>
          </div>
          {cleanView && (
            <button
              className="exit-tour"
              onClick={() => {
                if (recording) recorder.current?.stop();
                setCleanView(false);
              }}
            >
              <X size={16} />
              Exit tour view
            </button>
          )}
          {cleanView && (
            <button
              className={`record-tour ${recording ? 'recording' : ''}`}
              onClick={() =>
                recording ? recorder.current?.stop() : void startRecording()
              }
            >
              <span />
              {recording ? `Stop · ${recordSeconds}s` : 'Record tour'}
            </button>
          )}
        </section>
      </div>
      {(!storage.loaded || storage.conflict || storage.draft) && (
        <output className="sync-banner">
          <span>{storage.status}</span>
          {!storage.loaded && !storage.draft && !storage.conflict && (
            <button onClick={() => void storage.reload()}>
              Retry connection
            </button>
          )}
          {storage.conflict && (
            <>
              <button
                onClick={() =>
                  download(
                    new Blob([JSON.stringify(storage.getSnapshot(), null, 2)], {
                      type: 'application/json',
                    }),
                    'gym-paradise-private-backup.json',
                  )
                }
              >
                Back up this draft
              </button>
              <button onClick={() => void storage.reload()}>
                Load cloud & review draft
              </button>
            </>
          )}
          {storage.draft && (
            <>
              <button onClick={storage.recoverDraft}>
                Restore this device’s draft
              </button>
              <button onClick={storage.dismissDraft}>Keep cloud version</button>
            </>
          )}
        </output>
      )}
      <footer className="statusbar">
        <span>
          <span className="live-dot" />
          {storage.status}
        </span>
        <div>
          <button onClick={() => openFeatures('collection')}>
            My collection
          </button>
          <button onClick={() => setHelpOpen(true)}>Room list</button>
          <span>PROTOTYPE 02</span>
        </div>
      </footer>
      {notice && (
        <output className="toast" aria-live="polite">
          <CheckCheck size={18} />
          <span>{notice}</span>
          <button
            onClick={() => setNotice('')}
            aria-label="Dismiss notification"
          >
            <X size={16} />
          </button>
        </output>
      )}
      <input
        type="file"
        accept=".json,application/json"
        ref={importInput}
        className="sr-only"
        aria-label="Import gym layout file"
        onChange={(e) => readImport(e.target.files?.[0])}
      />
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="gym-dialog">
          <DialogHeader>
            <span className="dialog-icon">
              <Share2 />
            </span>
            <DialogTitle>Make your dream gym seen.</DialogTitle>
            <DialogDescription>
              Take a photo, record a walkthrough, or bring your layout to
              another device.
            </DialogDescription>
          </DialogHeader>
          <button
            className="dialog-option"
            onClick={capture}
            disabled={!ready || capturing}
          >
            <Camera />
            <span>
              <strong>Save a gym photo</strong>
              <small>Capture your current 3D view</small>
            </span>
            <Download size={17} />
          </button>
          <button className="dialog-option" onClick={startTour}>
            <Footprints />
            <span>
              <strong>Prepare a walkthrough</strong>
              <small>Walk through your gym without the editor</small>
            </span>
            <ArrowUpRight size={17} />
          </button>
          <button
            className="dialog-option"
            onClick={startRecording}
            disabled={!ready || recording}
          >
            <Camera />
            <span>
              <strong>Record a tour video</strong>
              <small>Up to 60 seconds · clean 3D view · no audio</small>
            </span>
          </button>
          <button className="dialog-option" onClick={exportLayout}>
            <Download />
            <span>
              <strong>Export layout</strong>
              <small>Keep a backup or transfer to another device</small>
            </span>
          </button>
          <button
            className="dialog-option"
            onClick={() => importInput.current?.click()}
          >
            <Upload />
            <span>
              <strong>Import layout</strong>
              <small>Open a Gym Paradise .json file</small>
            </span>
          </button>
          <button
            className="dialog-option"
            onClick={() =>
              download(
                new Blob([JSON.stringify(storage.getSnapshot(), null, 2)], {
                  type: 'application/json',
                }),
                'gym-paradise-private-backup.json',
              )
            }
          >
            <Download />
            <span>
              <strong>Private account backup</strong>
              <small>
                Includes wishlist and training. Photo references work in this
                account.
              </small>
            </span>
          </button>
          <p className="dialog-note">
            Your gym, collection and training sync through your signed-in
            account. Share downloaded photos, videos or layout files. Public
            visitor links are not enabled yet.
          </p>
        </DialogContent>
      </Dialog>
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="gym-dialog">
          <DialogHeader>
            <DialogTitle>Give your gym a name.</DialogTitle>
            <DialogDescription>
              This is your place. Make it yours.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!draftName.trim()) return;
              commit({ ...layout, name: draftName.trim() });
              setRenameOpen(false);
            }}
          >
            <label className="field-label" htmlFor="gym-name">
              Gym name
            </label>
            <input
              id="gym-name"
              className="text-field"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              maxLength={60}
              required
            />
            <button className="primary-button" type="submit">
              Save name
              <Check size={17} />
            </button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="gym-dialog help-dialog">
          <DialogHeader>
            <DialogTitle>Find your way around.</DialogTitle>
            <DialogDescription>
              Build the layout, then experience it at eye level.
            </DialogDescription>
          </DialogHeader>
          <div className="help-grid">
            <div>
              <Grid2X2 />
              <strong>Build</strong>
              <p>
                Choose Orbit to turn the view or Pan to slide across the floor.
                Two fingers pan and pinch to zoom; on a laptop, right-drag or
                hold Space to pan. Drag equipment from the library to preview
                and place it. Drop onto the bin to discard or delete; Undo
                brings a deleted piece back. You can also tap to preview,
                position it, then choose Place.
              </p>
            </div>
            <div>
              <Footprints />
              <strong>Explore</strong>
              <p>
                Use the thumbstick or W A S D to walk. Drag to look around.
                Arrow keys move forward/back and turn left/right.
              </p>
            </div>
          </div>
          <h3>In your gym · {layout.items.length} pieces</h3>
          <div className="room-list">
            {layout.items.map((i, index) => (
              <button
                key={i.id}
                onClick={() => {
                  setMode('build');
                  setSelected(i.id);
                  setHelpOpen(false);
                }}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                {EQUIPMENT[i.kind].name}
                <ArrowUpRight size={15} />
              </button>
            ))}
          </div>
          <p className="dialog-note">
            Equipment shapes and footprints are approximations. Tap nearby
            machines in Explore to log training. Your private gym saves to your
            account; exported layouts exclude your collection photos and workout
            records.
          </p>
          <button
            className="reset-link"
            onClick={() => {
              setHelpOpen(false);
              setResetOpen(true);
            }}
          >
            <RotateCcw size={15} />
            Restore the starter gym
          </button>
        </DialogContent>
      </Dialog>
      <GymExampleDialog
        open={exampleOpen}
        onOpenChange={setExampleOpen}
        enabled={ready && storage.loaded}
        onLoad={() => {
          api.current?.cancelPlacement();
          if (!commit(structuredClone(EXAMPLE_LAYOUT))) return;
          setSelected(null);
          setMode('build');
          setCeilingVisible(false);
          setExampleOpen(false);
          notify('Example gym loaded. Undo returns to your previous layout.');
        }}
        onBackup={exportLayout}
        onDownload={() =>
          download(
            new Blob(
              [JSON.stringify(portableLayout(EXAMPLE_LAYOUT), null, 2)],
              { type: 'application/json' },
            ),
            'paradise-showcase.json',
          )
        }
      />
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="gym-dialog">
          <DialogHeader>
            <DialogTitle>Restore the starter gym?</DialogTitle>
            <DialogDescription>
              This replaces your current layout. Export a backup first if you
              want to keep it. You can also Undo this change.
            </DialogDescription>
          </DialogHeader>
          <button
            className="primary-button"
            onClick={() => {
              commit(structuredClone(DEFAULT_LAYOUT));
              setSelected(null);
              setResetOpen(false);
              notify('Starter gym restored.');
            }}
          >
            Restore starter gym
          </button>
          <button className="dialog-option" onClick={exportLayout}>
            <Download />
            Export current layout first
          </button>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!importDraft}
        onOpenChange={(open) => {
          if (!open) setImportDraft(null);
        }}
      >
        <DialogContent className="gym-dialog">
          <DialogHeader>
            <DialogTitle>Open {importDraft?.name}?</DialogTitle>
            <DialogDescription>
              This replaces the current gym with {importDraft?.items.length}{' '}
              pieces from your file. The change can be undone.
            </DialogDescription>
          </DialogHeader>
          <button
            className="primary-button"
            onClick={() => {
              if (importDraft) commit(importDraft);
              setImportDraft(null);
              setShareOpen(false);
              setSelected(null);
              notify('Your gym is ready.');
            }}
          >
            Open imported gym
          </button>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!privateImport}
        onOpenChange={(open) => {
          if (!open) setPrivateImport(null);
        }}
      >
        <DialogContent className="gym-dialog">
          <DialogHeader>
            <DialogTitle>Restore private backup?</DialogTitle>
            <DialogDescription>
              Replace your gym, collection and training with{' '}
              {privateImport?.collection.length} wishlist machines and{' '}
              {privateImport?.sets.length} sets. Uploaded photo references work
              only in their original account.
            </DialogDescription>
          </DialogHeader>
          <button
            className="primary-button"
            disabled={!storage.loaded}
            onClick={() => {
              if (!privateImport) return;
              try {
                storage.update(() => privateImport);
                latest.current = privateImport.layout;
                setLayout(privateImport.layout);
                history.current = { past: [], future: [] };
                setHistorySize({ past: 0, future: 0 });
                setSelected(null);
                setPrivateImport(null);
                setShareOpen(false);
                notify('Private backup restored.');
              } catch (e) {
                notify(
                  e instanceof Error
                    ? e.message
                    : 'Could not restore this backup.',
                );
              }
            }}
          >
            Restore this backup
          </button>
        </DialogContent>
      </Dialog>
      {featuresOpen && storage.loaded && (
        <GymFeatures
          key={featureTab}
          open={featuresOpen}
          onOpenChange={setFeaturesOpen}
          initialTab={featureTab}
          collection={storage.data.collection}
          sets={storage.data.sets}
          items={layout.items}
          activeItem={layout.items.find((i) => i.id === inspectId)}
          onAddCollection={storage.addCollection}
          onPlace={placeCollection}
          onAddSet={storage.addSet}
          onDeleteSet={storage.deleteSet}
          notify={notify}
        />
      )}
    </main>
  );
}
