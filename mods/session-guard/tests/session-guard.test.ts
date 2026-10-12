import { expect, test } from 'claude-code/testing'

const usage = (usd: number) => () => ({ value: { context: { window: 200000, percent: 34 }, rateLimits: [], cost: { usd } } })

// Answer Claude Code's side of a tool call: the question dialog, or the tool itself
function tools(choice: string) {
  return ($, e) =>
    e.tool === 'AskUserQuestion'
      ? { result: { answers: { [e.questions[0].question]: choice } } }
      : { result: 'ran' }
}

test('under budget, tool calls run as usual', async ($, on) => {
  on('session.usage', usage(0.05))
  on('tool.call', tools('Stop here'))
  expect(await $.tool.call({ tool: 'Read', file_path: 'README.md' })).toEqual({ result: 'ran' })
})

test('over budget, the call is held and stopped when you say stop', async ($, on) => {
  on('session.usage', usage(1.25))
  on('tool.call', tools('Stop here'))
  const out = await $.tool.call({ tool: 'Bash', command: 'pytest' })
  expect(out.deny).toMatch(/^Paused by session-guard: the session reached its \$1\.00 budget/)
})

test('after you say stop, later calls in the same turn are refused without asking again', async ($, on) => {
  on('session.usage', usage(1.25))
  let asked = 0
  on('tool.call', ($, e) => {
    if (e.tool === 'AskUserQuestion') asked += 1
    return tools('Stop here')($, e)
  })
  await $.tool.call({ tool: 'Edit', file_path: 'app/main.py' })
  const out = await $.tool.call({ tool: 'Edit', file_path: 'tests/test_orders.py' })
  expect(out.deny).toMatch(/^Paused by session-guard/)
  expect(asked).toBe(1)
})

test('over budget, adding a dollar lets the call run', async ($, on) => {
  on('session.usage', usage(1.25))
  on('store.set', () => ({ value: undefined }))
  on('tool.call', tools('Add $1 and keep going'))
  expect(await $.tool.call({ tool: 'Bash', command: 'pytest' })).toEqual({ result: 'ran' })
})

test('over budget, a new prompt is dropped when you say stop', async ($, on) => {
  on('session.usage', usage(1.25))
  on('tool.call', tools('Stop here'))
  on('prompt.submit', ($, e) => ({ text: e.text }))
  const out = await $.prompt.submit({ text: 'now commit it', origin: { kind: 'composer' } })
  expect(out.drop).toMatch(/^Over your \$1\.00 budget/)
})

test('over budget, a prompt nobody typed goes through without asking', async ($, on) => {
  on('session.usage', usage(1.25))
  let asked = 0
  on('tool.call', ($, e) => {
    if (e.tool === 'AskUserQuestion') asked += 1
    return tools('Stop here')($, e)
  })
  on('prompt.submit', ($, e) => ({ text: e.text }))
  const out = await $.prompt.submit({ text: 'Background task finished', origin: { kind: 'task-notification' } })
  expect(out.drop).toBeUndefined()
  expect(asked).toBe(0)
})

test('adding a dollar raises this session only, /budget is what gets saved', async ($, on) => {
  on('session.usage', usage(1.25))
  const saved = []
  on('store.set', ($, e) => { saved.push(e); return { value: undefined } })
  on('tool.call', tools('Add $1 and keep going'))
  expect(await $.tool.call({ tool: 'Bash', command: 'pytest' })).toEqual({ result: 'ran' })
  expect(saved).toEqual([])
  const reply = await $.command.run({ command: 'budget', args: '3' })
  expect(reply.text).toBe('Budget set to $3.00. New sessions start with it too.')
  expect(saved.length).toBe(1)
})

test('the status band shows context, budget, tool calls and recording mode', async ($, on) => {
  on('session.usage', usage(0.12))
  on('store.set', () => ({ value: undefined }))
  on('tool.call', () => ({ result: 'ran' }))
  await $.tool.call({ tool: 'Read', file_path: 'README.md' })
  await $.command.run({ command: 'recording', args: 'on' })
  const ui = await $.ui.mount({
    plugin: 'session-guard',
    component: 'AbovePrompt',
    surface: 'terminal',
    viewport: { columns: 160, rows: 40 },
    props: { hasSurvey: false, isWorking: false, maxRows: 3, bodyColumns: 150, scroll: { offset: 0, bodyRows: 3 }, view: {} },
  })
  expect(await ui.find({ type: 'Text', text: 'tools' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '$0.12' })).toBeDefined()
  expect(await ui.find({ type: 'Raster', key: 'band-budget' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '● REC SAFE' })).toBeDefined()
})

test('recording mode hides a key on screen, display only', async ($, on) => {
  on('store.set', () => ({ value: undefined }))
  on('ui.render', ($, e) => ({ type: 'Text', props: {}, children: [e.props.text] }))
  await $.command.run({ command: 'recording', args: 'on' })
  const ui = await $.ui.mount({
    plugin: 'session-guard',
    component: 'AssistantMessage',
    surface: 'terminal',
    viewport: { columns: 120, rows: 40 },
    props: { text: 'Your key is sk-ant-api03-abcdefghijklmnop and mail me at dev@example.com', isFirstOfReply: true },
  })
  expect(await ui.find({ type: 'Text', text: 'Your key is [ANTHROPIC KEY] and mail me at [EMAIL]' })).toBeDefined()
})

test('recording mode leaves code like decorators alone', async ($, on) => {
  on('store.set', () => ({ value: undefined }))
  on('ui.render', ($, e) => ({ type: 'Text', props: {}, children: [e.props.text] }))
  await $.command.run({ command: 'recording', args: 'on' })
  const ui = await $.ui.mount({
    plugin: 'session-guard',
    component: 'AssistantMessage',
    surface: 'terminal',
    viewport: { columns: 120, rows: 40 },
    props: { text: '+@app.get("/orders/stats") and @router.post', isFirstOfReply: true },
  })
  expect(await ui.find({ type: 'Text', text: '+@app.get("/orders/stats") and @router.post' })).toBeDefined()
})
