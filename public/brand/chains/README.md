# Ecosystem logo assets

This folder holds one mark per ecosystem. The files currently here are
hand-authored reproductions of each project's logo in its brand colours — close
enough to be recognisable at 32px, but not the projects' official asset files.

Replacing any file with the official asset works with no code change: detection
is automatic and keyed on the filename.

## Naming

Name the file after the chain's knowledge-base slug:

    ethereum.svg      arbitrum.svg    base.svg
    optimism.svg      polygon.svg     avalanche.svg
    bnb-chain.svg     solana.svg      sui.svg
    aptos.svg         near.svg        celestia.svg
    cosmos.svg        scroll.svg      linea.svg

`.svg`, `.png` and `.webp` are all recognised. SVG is strongly preferred: the
marks render at 32×32 and vectors stay crisp on high-density displays.

Any slug without a file here falls back to Routefold's own geometric glyph, so
a partial set is fine — the grid stays visually consistent either way.

## What to source

Use each project's official brand or press kit asset. Prefer the monochrome or
single-colour variant where one exists; the tiles are small and full-colour
logos at 32px tend to read as noise next to each other.

## Attribution

Logos are used for nominative identification of the ecosystems Routefold models.
The coverage section on the landing page states this explicitly, and all marks
remain the property of their respective owners.

Before shipping publicly, check each project's brand guidelines and prefer their
official asset over the reproduction here. Several projects specify clear-space,
minimum sizing, or prohibit recolouring — a reproduction cannot honour rules it
does not know about.
