export const JOB_COLOR_PALETTE = [
  '#7aa6bd',
  '#79b8ad',
  '#d6a85f',
  '#b58bc4',
  '#d47c79',
  '#839ac7',
  '#72a86f',
  '#c58a61',
] as const

export const getDefaultJobColor = (index: number) =>
  JOB_COLOR_PALETTE[index % JOB_COLOR_PALETTE.length]

export const isValidJobColor = (color: string) =>
  /^#[0-9a-f]{6}$/i.test(color)
