import { spawn } from 'node:child_process'

export async function runWithCLI(
  prompt: string,
  onChunk?: (chunk: string) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('claude', ['-p', '--output-format', 'text'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (chunk: Buffer) => {
      const s = chunk.toString()
      stdout += s
      onChunk?.(s)
    })
    proc.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString()))

    proc.on('error', (err) => reject(new Error(`Failed to spawn claude CLI: ${err.message}`)))

    proc.on('close', (code) => {
      if (code !== 0) reject(new Error(`claude CLI exited with code ${code}: ${stderr.trim()}`))
      else resolve(stdout.trim())
    })

    proc.stdin.write(prompt)
    proc.stdin.end()
  })
}

export async function hasAuth(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('claude', ['--version'], { stdio: 'ignore' })
    proc.on('close', (code) => resolve(code === 0))
    proc.on('error', () => resolve(false))
  })
}
