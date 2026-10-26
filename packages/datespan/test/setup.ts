import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(cleanup)

// axe-core probes canvas for icon ligatures; jsdom has no canvas.
HTMLCanvasElement.prototype.getContext = () => null
