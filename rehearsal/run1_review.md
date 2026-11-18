# Rehearsal 1 review (New Recording 8, 19:42)

Transcript: run1_transcript.txt (faster-whisper small.en, offline). Name spellings in it are the model's, not your pronunciation.

## Timing per slide (target from Notion notes)

| # | Slide | Actual | Target | |
|---|---|---|---|---|
| 1 | Hook | 0:40 | 0:45 | ok |
| 2 | Sequence → shape → function | 1:28 | 1:45 | ok |
| 3 | AF2's three ideas | 1:43 | 2:15 | pair representation weak |
| 4 | Cost + bitter lesson | 1:35 | 1:00 | +0:35 (MNIST detour) |
| 5 | Text-to-image | 1:18 | 1:15 | ok |
| 6 | Flow matching | 1:46 | 2:30 | -0:45, core content skipped |
| 7 | Architecture | 3:00 | 1:45 | +1:15 |
| 8 | Block | 2:20 | 1:15 | +1:05 |
| 9 | Training | 1:48 | 1:30 | +0:18 |
| 10 | Swaps recap | 0:53 | 0:30 | +0:23 |
| 11 | Accuracy | 1:00 | 1:15 | ok |
| 12 | Gains | 1:10 | 1:00 | ok |
| - | Critical take (removed) | 0:33 | - | |
| 13 | Takeaway | 0:26 | 0:30 | ok |

Without the removed slide: ~19:10. Moving 0:45 into flow matching and cutting the overruns lands at ~17:30.

## Technical corrections

1. Slide 6: "SimpleFold is the first generative flow matching model" is wrong. It's the first flow-matching *folding* model built only from general-purpose transformer blocks (AlphaFlow, ESMFlow and others already used flow matching).
2. Slide 6: the linear interpolant, the target x - ε and the loss were never said. The process went "noise → velocity field → training lines → sampling → ODE".
3. Slide 7: "920 arrows or velocity fields". It's one velocity field, a 920 × 3 output (one 3D vector per atom).
4. Slide 8: "Layer norm is from a diffusion transformer" is wrong. Plain LayerNorm is old. What DiT contributed is adaLN: t is turned into scale, shift and gate (the teal line). That teal line, the key part, was skipped.
5. Slide 8: the SwiGLU explanation is wrong.
   - ReLU is max(0, x): 0 for negative inputs and x (not 1) for positive inputs.
   - SwiGLU is a *gated* unit: Swish(xW) ⊙ (xV), then a projection. One branch decides how much of the other passes through. It isn't just a smoother activation.
   - One sentence is enough: "a feed-forward layer with a learned gate, used in LLaMA and PaLM".
6. Slide 8, RoPE: "and then you have a local structure which is predicted…" makes it sound like a fifth thing. The reference conformer *is* that local structure. Three axes are the reference conformer's 3D coordinates (a rule-based, per-amino-acid shape) and one axis is the residue index.
7. Slide 9: "when distilling they used LDDT to determine how confident…" is wrong.
   - Filtering uses **pLDDT**, the source model's (AlphaFold2's or ESMFold's) own confidence.
   - **LDDT** is the second term of SimpleFold's training loss.
   - The loss equation on the slide was never explained.
8. Slide 9: AFESM-E is "up to 10 structures per cluster with pLDDT > 80" from AFESM (AlphaFold DB + ESM Atlas), not "the most confident samples from ESM".
9. Slide 10: "one loss term, so smoother and more stable" overstates it. It's two terms (FM + LDDT), and the paper doesn't claim more stable training. Safer wording: "one generative loss plus one structural term, instead of AlphaFold2's many protein-specific losses".

## Delivery

- **Pace:** 129 words/min is good.
- **"So":** 116 times, and it starts 39 of 176 sentences. Replace it with a pause, especially at slide transitions.
- **"kind of":** 13 times. "right?": 19 times.
- **Dead air:** 15 s at 8:05 during the sampling animation. Narrate it: "no x now; start from fresh noise and follow the learned arrows…".
- **Detours to cut** (together about 1:30):
  - The MNIST explanation (slide 4).
  - Vanishing gradients on the skip connection (slide 7): keep only "it lets the decoder tell atoms of the same residue apart".
  - ESM2 explained twice (slide 7).
- **Pair representation (slide 3)** needs a ready line: "Think of an N × N table; entry (i, j) holds what the model believes about residues i and j, like how far apart they are. The map is the real answer for our protein: dark = close."

## What worked

- Slide 2 (shape = function, transthyretin, why models are needed) was clear and well paced. This is the 30% problem-definition item.
- The triangle-update explanation was crisp.
- Slides 11-12 were well paced and the numbers were right.
- The hook, the reframe and the takeaway connect well.
