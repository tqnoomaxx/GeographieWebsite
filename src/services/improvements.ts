import { getSupabase } from '@/services/auth'
import type { Question } from '@/engine/types'

export const IMPROVEMENT_STATUSES = { open: 'Offen', working: 'In Arbeit', done: 'Erledigt' } as const
export const IMPROVEMENT_PRIORITIES = { low: 'Später', normal: 'Normal', high: 'Wichtig' } as const
export type ImprovementStatus = keyof typeof IMPROVEMENT_STATUSES
export type ImprovementPriority = keyof typeof IMPROVEMENT_PRIORITIES
export interface ImprovementContext {
  label: string
  path: string
  questionId?: string
  generator?: string
  scope?: string
  category?: string
  entities?: string[]
}
export interface Improvement {
  id: string
  title: string
  description: string
  context: ImprovementContext
  status: ImprovementStatus
  priority: ImprovementPriority
  created_at: string
  updated_at: string
}
export type ImprovementInput = Pick<Improvement, 'title' | 'description' | 'priority' | 'status'>

export function improvementContext(label: string, path: string, question?: Question): ImprovementContext {
  // Only router paths and a whitelist of quiz configuration are stored, never link secrets.
  const url = new URL(path, 'https://atlas.invalid')
  const params = new URLSearchParams()
  for (const key of [
    'mode',
    'quiz',
    'scope',
    'difficulty',
    'content',
    'case',
    'level',
    'practice',
    'collection',
    'population',
    'fields',
    'len',
    'repeat',
    'hide_hints',
    'only',
  ]) {
    for (const value of url.searchParams.getAll(key)) params.append(key, value)
  }
  return {
    label: label.slice(0, 200),
    path: `${url.pathname}${params.size ? `?${params}` : ''}`,
    ...(question
      ? {
          questionId: question.id,
          generator: question.metadata.generator,
          scope: question.metadata.scope,
          category: question.category,
          entities: question.entities,
        }
      : {}),
  }
}

function failure(error: { code?: string; message?: string }): Error {
  if (error.code === '42P01' || error.code === 'PGRST205')
    return new Error('Das Entwicklerpanel ist in dieser Datenbank noch nicht eingerichtet.')
  if (error.code === '42501' || error.code === 'PGRST301')
    return new Error('Keine Entwicklerrechte oder Sitzung abgelaufen. Bitte erneut anmelden.')
  return new Error(
    'Konnte nicht gespeichert oder geladen werden. Bitte Verbindung prüfen und erneut versuchen.',
  )
}

const columns = 'id,title,description,context,status,priority,created_at,updated_at'
export const improvements = {
  async hasAccess(userId: string): Promise<boolean> {
    const client = await getSupabase()
    const { data, error } = await client
      .from('admin_users')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw failure(error)
    return !!data
  },
  async list(): Promise<Improvement[]> {
    const client = await getSupabase()
    const { data, error } = await client
      .from('quiz_improvements')
      .select(columns)
      .order('created_at', { ascending: false })
    if (error) throw failure(error)
    return data as Improvement[]
  },
  async create(input: ImprovementInput, context: ImprovementContext): Promise<Improvement> {
    const client = await getSupabase()
    const { data, error } = await client
      .from('quiz_improvements')
      .insert({ ...input, title: input.title.trim(), description: input.description.trim(), context })
      .select(columns)
      .single()
    if (error) throw failure(error)
    return data as Improvement
  },
  async update(item: Improvement, input: ImprovementInput): Promise<Improvement> {
    const client = await getSupabase()
    const { data, error } = await client
      .from('quiz_improvements')
      .update({ ...input, title: input.title.trim(), description: input.description.trim() })
      .eq('id', item.id)
      .eq('updated_at', item.updated_at)
      .select(columns)
      .maybeSingle()
    if (error) throw failure(error)
    if (!data)
      throw new Error(
        'Der Eintrag wurde inzwischen geändert oder deine Rechte wurden entzogen. Bitte die Liste neu laden.',
      )
    return data as Improvement
  },
  async remove(item: Improvement): Promise<void> {
    const client = await getSupabase()
    const { data, error } = await client
      .from('quiz_improvements')
      .delete()
      .eq('id', item.id)
      .eq('updated_at', item.updated_at)
      .select('id')
      .maybeSingle()
    if (error) throw failure(error)
    if (!data)
      throw new Error(
        'Der Eintrag wurde inzwischen geändert oder deine Rechte wurden entzogen. Bitte die Liste neu laden.',
      )
  },
}
