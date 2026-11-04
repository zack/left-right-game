import { Button } from '@mantine/core';
import { useEffect, useRef } from 'react';

export default function HelpScreen({ onBack }: { onBack: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <main className='screen help'>
      <h1 className='title' ref={headingRef} tabIndex={-1}>
        Help
      </h1>

      <h2 className='section-heading'>How to play</h2>
      <p>
        The game says or shows “left” or “right.” Tap that half of the screen,
        or press the left or right arrow key.
      </p>

      <h2 className='section-heading'>Modes</h2>
      <ul>
        <li>
          <strong>Round:</strong> 10, 20 or 50 prompts, with an equal number of
          each side.
        </li>
        <li>
          <strong>Clock:</strong> as many as you can get right in 30, 60 or 120
          seconds.
        </li>
        <li>
          <strong>Endless:</strong> keep going until you press Stop. Your best
          is your longest run of right answers in a row.
        </li>
      </ul>

      <h2 className='section-heading'>Settings</h2>
      <ul>
        <li>
          <strong>Prompt:</strong> hear the word, see it, or both.
        </li>
        <li>
          <strong>Time to answer:</strong> how long you get for each prompt. If
          time runs out, it counts as wrong.
        </li>
        <li>
          <strong>Vibrate on a wrong answer:</strong> on phones that can
          vibrate.
        </li>
        <li>
          <strong>Theme:</strong> follow your device, or pick light or dark.
        </li>
      </ul>

      <h2 className='section-heading'>Leaving a game</h2>
      <p>
        There’s no pause. If you switch apps or lock the screen during a game,
        that game is thrown away and isn’t saved. Quit does the same. In
        Endless, Stop ends the game and saves it.
      </p>

      <h2 className='section-heading'>Your history</h2>
      <p>
        Your sessions and best scores are kept on this device only. Clear them
        from the History screen.
      </p>

      <h2 className='section-heading'>Screen readers</h2>
      <p>
        The game screen doesn’t work with a phone screen reader’s touch mode. On
        a computer, set Prompt to Spoken and use the left and right arrow keys.
      </p>

      <div className='fields'>
        <Button onClick={onBack} variant='default'>
          Start screen
        </Button>
      </div>
    </main>
  );
}
