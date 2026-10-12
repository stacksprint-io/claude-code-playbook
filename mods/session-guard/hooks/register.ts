// session-guard: a live HUD for your Claude Code session, one feature per move a mod can make.
//   1. OBSERVE + DRAW: a status band above the prompt and a /hud dashboard pane.
//   2. ANSWER: a budget guard that pauses Claude when the session passes the budget you set.
//   3. REWRITE: recording mode hides keys, tokens and emails in what Claude Code draws.

// What recording mode hides on screen. Display only: Claude and the stored transcript keep the real text.
const SECRETS: [RegExp, string][] = [
  [/sk-ant-[A-Za-z0-9_-]{8,}/g, '[ANTHROPIC KEY]'],
  [/sk-[A-Za-z0-9_-]{20,}/g, '[API KEY]'],
  [/gh[pousr]_[A-Za-z0-9]{20,}/g, '[GITHUB TOKEN]'],
  [/AKIA[0-9A-Z]{16}/g, '[AWS KEY]'],
  // An email starts with a letter or digit, so code like @app.get or +@decorator is left alone
  [/\b[A-Za-z0-9][A-Za-z0-9._%+-]*@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}\b/g, '[EMAIL]'],
]

const PANE = 'session-hud'
const SPARK = '▁▂▃▄▅▆▇█'

// The dashboard's palette, as 0xRRGGBB
const C = {
  teal: 0x2dd4bf, violet: 0x8b7cf6, amber: 0xf5a623, red: 0xf0465a, green: 0x3fb950,
  blue: 0x4493f8, dim: 0x8b93a7, border: 0x3a3f4b, track: 0x353a46, bg: 0x01000000,
}
const hex = (c: number) => '#' + c.toString(16).padStart(6, '0')

// Green, then amber, then red as a share fills up
const heatColor = (share: number) => (share < 0.6 ? C.green : share < 0.85 ? C.amber : C.red)

// Each tool gets its own color in the chart
const toolColor = (name: string) =>
  ({ Edit: C.violet, Write: C.violet, MultiEdit: C.violet, Read: C.teal, Bash: C.amber, Grep: C.blue, Glob: C.blue })[name] ?? C.dim

// claude-opus-5-5 -> Opus 5.5
const prettyModel = (id: string) =>
  id.replace(/^claude-/, '').replace(/-(\d+)-(\d+).*$/, ' $1.$2').replace(/^./, (c) => c.toUpperCase())

// A color fading in from dim at the start of a bar to full strength at its end
function shade(color: number, t: number): number {
  const k = 0.45 + 0.55 * Math.max(0, Math.min(1, t))
  const r = Math.round(((color >> 16) & 255) * k), g = Math.round(((color >> 8) & 255) * k), b = Math.round((color & 255) * k)
  return (r << 16) | (g << 8) | b
}

// Pack [character, color] cells into the base64 string a Raster takes
function cells(row: [string, number][]): string {
  const words = row.flatMap(([ch, color]) => [ch.codePointAt(0) ?? 32, color, C.bg])
  return new Uint8Array(Uint32Array.from(words).buffer).toBase64()
}

// Shared by the hooks below
const tools: Record<string, number> = {}
const files: Record<string, number> = {}
const turnCosts: number[] = []
let now = 'idle'
let cwd = ''
let turnStartCost = 0
let budget = 1
let stopped = false // you said "Stop here" this turn
let recording = false

function mask(text: string): string {
  return SECRETS.reduce((t, [pattern, label]) => t.replace(pattern, label), text)
}

// Mask every string inside a value, keeping its shape (a tool's result is an object)
function maskAll(value: unknown): unknown {
  if (typeof value === 'string') return mask(value)
  if (Array.isArray(value)) return value.map(maskAll)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, maskAll(v)]))
  }
  return value
}

async function costNow($): Promise<number> {
  const usage = await $.session.usage()
  return usage.cost ? usage.cost.usd : 0
}

// 2 · ANSWER: hold the call when the session is over budget, and ask
async function budgetGate($, e, next) {
  const cost = await costNow($)
  if (cost < budget) return next(e)
  const paused = { deny: 'Paused by session-guard: the session reached its $' + budget.toFixed(2) + ' budget. Stop now and summarize what is done and what is left.' }
  // Claude can try another tool after a refusal: your answer stands for the rest of the turn
  if (stopped) return paused
  let answer = 'Stop here'
  try {
    answer = await $.ui.ask('This session has cost $' + cost.toFixed(2) + ', over your $' + budget.toFixed(2) + ' budget. Keep going?', [
      'Stop here',
      'Add $1 and keep going',
    ])
  } catch {
    // Nobody to ask: keep the safe answer
  }
  if (answer === 'Add $1 and keep going') {
    budget += 1
    await $.store.set('budget', budget)
    $.ui.invalidate('ui.render')
    return next(e)
  }
  stopped = true
  return paused
}

export function register(on) {
  // Runs before your first prompt, and again after a reload
  on('session.start', async ($, e, next) => {
    cwd = await $.session.cwd()
    recording = (await $.store.get('recording')) === true
    budget = Number((await $.store.get('budget')) ?? 1)
    await $.command.register({ name: 'hud', description: 'Open the session dashboard', immediate: true })
    await $.command.register({ name: 'budget', description: 'Set the session budget in dollars', argumentHint: '[amount]', immediate: true })
    await $.command.register({ name: 'recording', description: 'Hide keys, tokens and emails on screen', argumentHint: '[on|off]', immediate: true })
    return next(e)
  })

  // ---------- 1 · OBSERVE: what Claude is doing ----------
  on('tool.call', async ($, e, next) => {
    // A question this mod asks reaches here as a tool call too: let it through untouched
    if (e.tool === 'AskUserQuestion') return next(e)
    tools[e.tool] = (tools[e.tool] ?? 0) + 1
    // What it's doing, with paths shown relative to the project
    now = (e.tool + (e.command ? ': ' + e.command : e.file_path ? ': ' + e.file_path : '')).split(cwd + '/').join('')
    if ((e.tool === 'Edit' || e.tool === 'Write') && e.file_path) {
      const name = e.file_path.split('/').slice(-2).join('/')
      files[name] = (files[name] ?? 0) + 1
    }
    $.ui.invalidate('ui.render')
    // 2 · ANSWER: the budget guard decides whether the call goes ahead
    return budgetGate($, e, next)
  })

  on('turn.start', async ($, e, next) => {
    stopped = false
    turnStartCost = await costNow($)
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (!e.agentId) {
      turnCosts.push((await costNow($)) - turnStartCost)
      now = 'idle'
      $.ui.invalidate('ui.render')
    }
    return next(e)
  })

  // ---------- 1 · DRAW: the status band above the prompt ----------
  on('ui.render', { component: 'AbovePrompt' }, async ($, e) => {
    const { Box, Text, Raster } = $.ui.resolve(e)
    const usage = await $.session.usage()
    const ctx = (usage.context.percent ?? 0) / 100
    const cost = usage.cost ? usage.cost.usd : 0
    // Narrower bars when a pane takes half the screen, so the band stays on one line
    const wide = (e.props.bodyColumns ?? 120) >= 110
    const size = wide ? 12 : 6
    const slim = (key: string, share: number) => {
      const filled = Math.max(0, Math.min(size, Math.round(share * size)))
      const color = heatColor(share)
      if (e.surface !== 'terminal') return Text({ children: [Text({ color: hex(color), children: ['▆'.repeat(filled)] }), Text({ color: hex(C.track), children: ['▆'.repeat(size - filled)] })] })
      return Raster({ key, columns: size, rows: 1, cells: cells(Array.from({ length: size }, (_, i) => ['▆', i < filled ? shade(color, i / size) : C.track] as [string, number])) })
    }
    const calls = Object.values(tools).reduce((a, b) => a + b, 0)
    const parts = [
      Text({ color: hex(C.teal), bold: true, children: [wide ? '◆ session-guard' : '◆'] }),
      Box({ flexDirection: 'row', columnGap: 1, children: [Text({ color: hex(C.dim), children: ['context'] }), slim('band-ctx', ctx), Text({ bold: true, children: [Math.round(ctx * 100) + '%'] })] }),
      Box({ flexDirection: 'row', columnGap: 1, children: [Text({ color: hex(C.dim), children: ['budget'] }), slim('band-budget', cost / budget), Text({ bold: true, children: ['$' + cost.toFixed(2)] }), Text({ color: hex(C.dim), children: ['/ $' + budget.toFixed(2)] })] }),
      Box({ flexDirection: 'row', columnGap: 1, children: [Text({ color: hex(C.dim), children: ['tools'] }), Text({ bold: true, children: [String(calls)] })] }),
    ]
    if (recording) parts.push(Text({ color: hex(C.red), bold: true, children: [wide ? '● REC SAFE' : '● REC'] }))
    return Box({ flexDirection: 'row', columnGap: wide ? 3 : 2, borderStyle: 'round', borderColor: hex(C.teal), paddingX: 1, children: parts })
  })

  // ---------- 1 · DRAW: the /hud dashboard pane ----------
  on('command.run', { command: 'hud' }, async ($) => {
    await $.ui.open({ id: PANE, title: 'Session HUD', closeOnEscape: true })
    return {}
  })

  on('ui.render', { component: 'Pane' }, async ($, e, next) => {
    if (e.requestId !== PANE) return next(e)
    const { Box, Text, Raster } = $.ui.resolve(e)
    const usage = await $.session.usage()
    const model = await $.session.model()
    const ctx = (usage.context.percent ?? 0) / 100
    const cost = usage.cost ? usage.cost.usd : 0
    const terminal = e.surface === 'terminal'
    const W = Math.max(40, e.props.bodyColumns ?? 60)
    const half = Math.floor((W - 1) / 2)

    // A slim meter: a colored line over a dark track (a Raster in the terminal, text elsewhere)
    const meter = (key: string, share: number, width: number, color: number) => {
      const filled = Math.max(0, Math.min(width, Math.round(share * width)))
      if (!terminal) {
        return Text({ children: [Text({ color: hex(color), children: ['▆'.repeat(filled)] }), Text({ color: hex(C.track), children: ['▆'.repeat(width - filled)] })] })
      }
      const row = Array.from({ length: width }, (_, i) => ['▆', i < filled ? shade(color, i / width) : C.track] as [string, number])
      return Raster({ key, columns: width, rows: 1, cells: cells(row) })
    }
    const card = (title: string, width: number, children: unknown[], right?: unknown) =>
      Box({
        width,
        flexDirection: 'column',
        borderStyle: 'round',
        borderColor: hex(C.border),
        paddingX: 1,
        children: [
          Box({ flexDirection: 'row', justifyContent: 'space-between', children: [Text({ color: hex(C.dim), bold: true, children: [title] }), right ?? Text({ children: [''] })] }),
          ...children,
        ],
      })
    const inner = (width: number) => width - 4

    // Header
    const header = Box({
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingX: 1,
      children: [
        Text({ children: [Text({ color: hex(C.teal), bold: true, children: ['◆ SESSION HUD'] })] }),
        Text({ children: [recording ? Text({ color: hex(C.red), bold: true, children: ['● REC   '] }) : '', Text({ color: hex(C.dim), children: [prettyModel(model) + ' · ' + turnCosts.length + (turnCosts.length === 1 ? ' turn' : ' turns')] })] }),
      ],
    })

    // Context and budget, side by side
    const ctxColor = heatColor(ctx)
    const budgetColor = heatColor(cost / budget)
    const tokens = Math.round((ctx * usage.context.window) / 1000)
    const meters = Box({
      flexDirection: 'row',
      columnGap: 1,
      children: [
        card('CONTEXT', half, [
          Text({ children: [Text({ color: hex(ctxColor), bold: true, children: [Math.round(ctx * 100) + '%'] }), Text({ color: hex(C.dim), children: ['  ' + tokens + 'k of ' + Math.round(usage.context.window / 1000) + 'k'] })] }),
          meter('ctx', ctx, inner(half), ctxColor),
        ]),
        card('BUDGET', half, [
          Text({ children: [Text({ color: hex(budgetColor), bold: true, children: ['$' + cost.toFixed(2)] }), Text({ color: hex(C.dim), children: ['  of $' + budget.toFixed(2)] })] }),
          meter('budget', cost / budget, inner(half), budgetColor),
        ]),
      ],
    })

    // Cost per turn: one bar per turn, two cells wide
    const spark = (() => {
      const shown = turnCosts.slice(-Math.floor(inner(W) / 4))
      if (!shown.length) return Text({ color: hex(C.dim), children: ['waiting for the first turn'] })
      const top = Math.max(...shown, 0.0001)
      const avg = turnCosts.reduce((a, b) => a + b, 0) / turnCosts.length
      // Each bar is up to two rows tall (16 steps): the bottom row fills first, then the top
      const top_: [string, number][] = []
      const bottom: [string, number][] = []
      for (const v of shown) {
        const level = Math.max(1, Math.round((v / top) * 16))
        const color = shade(C.amber, v / top)
        const low = level >= 8 ? '█' : SPARK[level - 1]
        const high = level > 8 ? SPARK[level - 9] : ' '
        top_.push([high, color], [high, color], [high, color], [' ', C.bg])
        bottom.push([low, color], [low, color], [low, color], [' ', C.bg])
      }
      return Box({
        flexDirection: 'column',
        children: [
          terminal
            ? Raster({ key: 'turns', columns: bottom.length, rows: 2, cells: cells([...top_, ...bottom]) })
            : Text({ color: hex(C.amber), children: [bottom.map((b) => b[0]).join('')] }),
          Text({ color: hex(C.dim), children: ['last $' + shown[shown.length - 1].toFixed(3) + ' · avg $' + avg.toFixed(3)] }),
        ],
      })
    })()

    // Tools, busiest first, each with its own color
    const sorted = Object.entries(tools).sort((a, b) => b[1] - a[1]).slice(0, 6)
    const most = Math.max(1, ...sorted.map(([, n]) => n))
    const barWidth = Math.max(6, inner(W) - 18)
    const toolRows = sorted.length
      ? sorted.map(([name, n]) =>
          Box({
            flexDirection: 'row',
            columnGap: 1,
            children: [
              Text({ color: hex(toolColor(name)), children: ['●'] }),
              Text({ children: [name.slice(0, 10).padEnd(10)] }),
              meter('tool-' + name, n / most, barWidth, toolColor(name)),
              Text({ bold: true, children: [String(n).padStart(3)] }),
            ],
          }),
        )
      : [Text({ color: hex(C.dim), children: ['no tool calls yet'] })]

    // Files Claude changed, with how many edits each
    const fileRows = Object.keys(files).length
      ? Object.entries(files).slice(0, 5).map(([name, n]) =>
          Box({ flexDirection: 'row', justifyContent: 'space-between', children: [Text({ color: hex(C.green), children: ['✎ ' + name] }), Text({ color: hex(C.dim), children: ['×' + n] })] }),
        )
      : [Text({ color: hex(C.dim), children: ['no files changed yet'] })]

    // What Claude is doing right now
    const status = now === 'idle'
      ? Text({ children: [Text({ color: hex(C.green), children: ['● '] }), Text({ color: hex(C.dim), children: ['ready'] })] })
      : Text({ wrap: 'truncate-end', children: [Text({ color: hex(C.amber), children: ['▶ '] }), Text({ children: [mask(now)] })] })

    return Box({
      flexDirection: 'column',
      children: [
        header,
        meters,
        card('COST PER TURN', W, [spark]),
        card('TOOLS', W, toolRows, Text({ color: hex(C.dim), children: [Object.values(tools).reduce((a, b) => a + b, 0) + ' calls'] })),
        card('FILES CHANGED', W, fileRows),
        card('NOW', W, [status]),
      ],
    })
  })

  // ---------- 2 · ANSWER: a new prompt over budget waits for your yes ----------
  on('prompt.submit', async ($, e, next) => {
    const cost = await costNow($)
    if (cost < budget) return next(e)
    let answer = 'Stop here'
    try {
      answer = await $.ui.ask('This session has cost $' + cost.toFixed(2) + ', over your $' + budget.toFixed(2) + ' budget. Send this prompt anyway?', [
        'Stop here',
        'Add $1 and send',
      ])
    } catch {
      // Nobody to ask: keep the safe answer
    }
    if (answer !== 'Add $1 and send') return { drop: 'Over your $' + budget.toFixed(2) + ' budget. Raise it with /budget, or start a new session.' }
    budget += 1
    await $.store.set('budget', budget)
    $.ui.invalidate('ui.render')
    return next(e)
  })

  // ---------- 2 · ANSWER: /budget sets the limit (the gate is budgetGate, above) ----------
  on('command.run', { command: 'budget' }, async ($, e) => {
    const amount = Number(e.args.trim().replace('$', ''))
    if (!(amount > 0)) return { text: 'Budget is $' + budget.toFixed(2) + '. Set one with /budget 2.50' }
    budget = amount
    await $.store.set('budget', budget)
    $.ui.invalidate('ui.render')
    return { text: 'Budget set to $' + budget.toFixed(2) + ' for this session.' }
  })

  // ---------- 3 · REWRITE: recording mode ----------
  on('command.run', { command: 'recording' }, async ($, e) => {
    const arg = e.args.trim()
    recording = arg === 'on' ? true : arg === 'off' ? false : !recording
    await $.store.set('recording', recording)
    $.ui.invalidate('ui.render')
    return {
      text: recording
        ? 'Recording mode on: keys, tokens and emails are hidden on screen. Claude still reads the real text.'
        : 'Recording mode off.',
    }
  })

  on('ui.render', { component: ['AssistantMessage', 'UserMessage', 'CommandOutput'] }, async ($, e, next) => {
    if (!recording) return next(e)
    return next({ ...e, props: { ...e.props, text: mask(e.props.text) } })
  })
  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    if (!recording) return next(e)
    return next({ ...e, props: { ...e.props, input: maskAll(e.props.input), output: maskAll(e.props.output) } })
  })
  on('ui.render', { component: 'ToolResult' }, async ($, e, next) => {
    if (!recording) return next(e)
    return next({ ...e, props: { ...e.props, output: maskAll(e.props.output) } })
  })
}
