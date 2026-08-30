import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ConnectionForm from './ConnectionForm.tsx'

describe('ConnectionForm', () => {
  it('defaults to password auth and hides the private key field', () => {
    render(<ConnectionForm onSubmit={vi.fn()} onCancel={vi.fn()} />)

    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/private key/i)).not.toBeInTheDocument()
  })

  it('switches to the private key field when SSH key auth is selected', () => {
    render(<ConnectionForm onSubmit={vi.fn()} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByLabelText(/authentication/i), { target: { value: 'key' } })

    expect(screen.queryByLabelText(/^password$/i)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/private key/i)).toBeInTheDocument()
  })

  it('submits a key-auth payload with private_key instead of password', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<ConnectionForm onSubmit={onSubmit} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'my-box' } })
    fireEvent.change(screen.getByLabelText(/^host$/i), { target: { value: '10.0.0.5' } })
    fireEvent.change(screen.getByLabelText(/^username$/i), { target: { value: 'deploy' } })
    fireEvent.change(screen.getByLabelText(/authentication/i), { target: { value: 'key' } })
    fireEvent.change(screen.getByLabelText(/private key/i), { target: { value: 'fake-key-contents' } })

    fireEvent.click(screen.getByRole('button', { name: /add connection/i }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    const payload = onSubmit.mock.calls[0][0]
    expect(payload.auth_type).toBe('key')
    expect(payload.private_key).toBe('fake-key-contents')
    expect(payload.password).toBeUndefined()
  })

  it('parses comma-separated tags into a trimmed array', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<ConnectionForm onSubmit={onSubmit} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'my-box' } })
    fireEvent.change(screen.getByLabelText(/^host$/i), { target: { value: '10.0.0.5' } })
    fireEvent.change(screen.getByLabelText(/^username$/i), { target: { value: 'deploy' } })
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'hunter2' } })
    fireEvent.change(screen.getByLabelText(/tags/i), { target: { value: 'prod, web ,  ' } })

    fireEvent.click(screen.getByRole('button', { name: /add connection/i }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0].tags).toEqual(['prod', 'web'])
  })

  it('pre-fills tags from initialValues when editing', () => {
    render(
      <ConnectionForm
        isEditing
        initialValues={{
          id: 1,
          name: 'my-box',
          host: '10.0.0.5',
          port: 22,
          username: 'deploy',
          auth_type: 'password',
          tags: ['prod', 'web'],
          created_at: null,
        }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.getByLabelText(/tags/i)).toHaveValue('prod, web')
  })
})
