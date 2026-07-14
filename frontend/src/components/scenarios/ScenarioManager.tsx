import { useEffect, useMemo, useState } from 'react'
import { Play, Save, Tag, Trash2 } from 'lucide-react'
import Button from '@/ui/Button'
import Input from '@/ui/Input'
import Modal from '@/ui/Modal'
import { useToast } from '@/ui/toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/Card'
import { scenarioService, type Scenario } from '@/services/scenarioService'

export default function ScenarioManager({ isLight }: { isLight?: boolean }) {
  const { push } = useToast()
  const [scenarios, setScenarios] = useState<Scenario[]>([])

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')

  useEffect(() => {
    setScenarios(scenarioService.getAllScenarios())
  }, [])

  const parsedTags = useMemo(() => tags.split(',').map((t) => t.trim()).filter(Boolean), [tags])

  function reload() {
    setScenarios(scenarioService.getAllScenarios())
  }

  function onSave() {
    if (!name.trim()) {
      push({ tone: 'error', title: 'Scenario name required' })
      return
    }

    try {
      scenarioService.saveCurrentScenario({ name: name.trim(), description: description.trim(), tags: parsedTags })
      push({ tone: 'success', title: 'Scenario saved' })
      setOpen(false)
      setName('')
      setDescription('')
      setTags('')
      reload()
    } catch (e) {
      push({ tone: 'error', title: 'Save failed', message: e instanceof Error ? e.message : 'Failed to save' })
    }
  }

  function onLoad(id: string) {
    if (!confirm('Loading this scenario will replace your current state. Continue?')) return
    try {
      scenarioService.loadScenario(id)
    } catch (e) {
      push({ tone: 'error', title: 'Load failed', message: e instanceof Error ? e.message : 'Failed to load' })
    }
  }

  function onDelete(id: string) {
    if (!confirm('Delete this scenario? This cannot be undone.')) return
    try {
      scenarioService.deleteScenario(id)
      push({ tone: 'success', title: 'Scenario deleted' })
      reload()
    } catch (e) {
      push({ tone: 'error', title: 'Delete failed', message: e instanceof Error ? e.message : 'Failed to delete' })
    }
  }

  return (
    <div className="space-y-6">
      <Card className={isLight ? 'border border-slate-900/10 bg-white' : undefined}>
        <CardHeader className={isLight ? 'border-slate-900/10' : undefined}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className={isLight ? 'text-slate-900' : undefined}>Scenario Manager</CardTitle>
              <div className={isLight ? 'mt-1 text-xs text-slate-600' : 'mt-1 text-xs text-white/60'}>
                Save and reload complete simulation configurations
              </div>
            </div>
            <Button onClick={() => setOpen(true)}>
              <Save className="h-4 w-4" />
              Save Current State
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className={isLight ? 'text-sm text-slate-700' : 'text-sm text-white/70'}>
            Saved scenarios: <span className="font-semibold">{scenarios.length}</span>
          </div>
        </CardContent>
      </Card>

      {scenarios.length ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {scenarios.map((s) => (
            <Card key={s.id} className={isLight ? 'border border-slate-900/10 bg-white' : undefined}>
              <CardHeader className={isLight ? 'border-slate-900/10' : undefined}>
                <CardTitle className={isLight ? 'text-slate-900' : undefined}>{s.name}</CardTitle>
                <div className={isLight ? 'mt-1 text-xs text-slate-600' : 'mt-1 text-xs text-white/60'}>
                  Saved: {new Date(s.createdAt).toLocaleString()}
                </div>
              </CardHeader>
              <CardContent>
                {s.description ? <div className={isLight ? 'text-sm text-slate-700' : 'text-sm text-white/70'}>{s.description}</div> : null}

                {s.tags.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {s.tags.map((t) => (
                      <span
                        key={t}
                        className={
                          isLight
                            ? 'inline-flex items-center gap-1 rounded-full border border-slate-900/10 bg-slate-900/5 px-2 py-1 text-xs font-semibold text-slate-700'
                            : 'inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs font-semibold text-white/70'
                        }
                      >
                        <Tag className="h-3 w-3" />
                        {t}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={() => onLoad(s.id)} variant="primary">
                    <Play className="h-4 w-4" />
                    Load
                  </Button>
                  <Button onClick={() => onDelete(s.id)} variant="outline">
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className={isLight ? 'border border-slate-900/10 bg-white' : undefined}>
          <CardContent className="p-10 text-center">
            <div className={isLight ? 'text-sm font-semibold text-slate-900' : 'text-sm font-semibold text-white'}>No saved scenarios</div>
            <div className={isLight ? 'mt-1 text-sm text-slate-600' : 'mt-1 text-sm text-white/60'}>
              Save your current system state to reuse configurations.
            </div>
          </CardContent>
        </Card>
      )}

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Save Scenario"
        description="Store a snapshot of current campus data, grid, events, and simulation state"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={onSave}>Save</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <div className={isLight ? 'mb-1 text-sm font-semibold text-slate-700' : 'mb-1 text-sm font-semibold text-white/70'}>Scenario name</div>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Peak Load Scenario"
              className={isLight ? 'border-slate-900/10 bg-white text-slate-900 placeholder:text-slate-400 focus:border-brand-500/60' : undefined}
            />
          </div>

          <div>
            <div className={isLight ? 'mb-1 text-sm font-semibold text-slate-700' : 'mb-1 text-sm font-semibold text-white/70'}>Description</div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={
                isLight
                  ? 'w-full rounded-xl border border-slate-900/10 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20'
                  : 'w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-brand-400/80 focus:ring-2 focus:ring-brand-500/20'
              }
              rows={4}
              placeholder="Describe what this scenario represents"
            />
          </div>

          <div>
            <div className={isLight ? 'mb-1 text-sm font-semibold text-slate-700' : 'mb-1 text-sm font-semibold text-white/70'}>Tags (comma separated)</div>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. demo, exam-week, high-load"
              className={isLight ? 'border-slate-900/10 bg-white text-slate-900 placeholder:text-slate-400 focus:border-brand-500/60' : undefined}
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
