// Drawn as SVG rather than typed as characters, so every device draws the
// same shape instead of whatever its fallback font has, and forced colors
// picks them up through currentColor.
export const Check = () => (
  <svg aria-hidden='true' className='mark' viewBox='0 0 24 24'>
    <path
      d='M4 12.5l5 5L20 6.5'
      fill='none'
      stroke='currentColor'
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth='3'
    />
  </svg>
);

export const Cross = () => (
  <svg aria-hidden='true' className='mark' viewBox='0 0 24 24'>
    <path
      d='M6 6l12 12M18 6L6 18'
      fill='none'
      stroke='currentColor'
      strokeLinecap='round'
      strokeWidth='3'
    />
  </svg>
);
