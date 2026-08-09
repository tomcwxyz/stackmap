'use client';

import { useCallback, useState } from 'react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { EXAMPLE_MAPS, type ExampleMap } from '@/lib/examples';

/** Where an example lands, so it opens on the view that shows the most. */
function reviewPath(example: ExampleMap): string {
  return example.build().metadata.mappingPath === 'service_first'
    ? '/wizard/services/review'
    : '/wizard/functions/review';
}

/**
 * Finished maps to look at before building one.
 *
 * The wizard's suggestion lists show what tools a small charity might have.
 * They do not show what a finished map looks like, which is the thing that
 * tells someone whether this is worth an afternoon.
 *
 * An example always arrives as its own map rather than replacing what is
 * there. Nobody should lose an afternoon's work to a curious click, and the
 * example can be deleted from Your maps once it has done its job.
 */
export function ExamplePicker() {
  const { createMapFrom } = useWorkspace();
  const [opening, setOpening] = useState<string | null>(null);

  const handleOpen = useCallback(
    (example: ExampleMap) => {
      setOpening(example.id);
      createMapFrom(`${example.name} (example)`, example.build());
      // A full page load rather than a client-side route change. The wizard's
      // layout owns the architecture provider, so navigating within it keeps
      // the map that was already loaded and the example never appears.
      window.location.assign(reviewPath(example));
    },
    [createMapFrom],
  );

  return (
    <section className="space-y-4" aria-labelledby="examples-heading">
      <div className="space-y-1">
        <h2
          id="examples-heading"
          className="text-sm font-semibold text-primary-800 uppercase tracking-wide"
        >
          Or look at a finished map first
        </h2>
        <p className="text-sm text-primary-600">
          Three worked examples, complete with costs, owners, data and the things nobody got
          round to. Each opens as its own map, so nothing you have made is touched.
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-3" role="list">
        {EXAMPLE_MAPS.map((example) => (
          <li
            key={example.id}
            className="flex flex-col rounded-lg border border-surface-300 bg-white p-4"
          >
            <h3 className="font-display font-semibold text-primary-900">{example.name}</h3>
            <p className="text-sm text-primary-600 mt-0.5">{example.summary}</p>

            <ul className="mt-3 space-y-1 flex-1" role="list">
              {example.highlights.map((highlight) => (
                <li key={highlight} className="text-xs text-primary-700 flex gap-1.5">
                  <span
                    className="mt-1.5 h-1 w-1 rounded-full bg-primary-400 flex-shrink-0"
                    aria-hidden="true"
                  />
                  {highlight}
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => handleOpen(example)}
              disabled={opening !== null}
              className="btn-secondary text-sm mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {opening === example.id ? 'Opening…' : 'Open this example'}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
