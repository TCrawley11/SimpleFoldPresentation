# Rehearsal 2 review (17:43, run 1 was 19:42)

Transcript: run2_transcript.txt. Name spellings in it come from the speech model.

## Timing per slide

| # | Slide | Run 2 | Run 1 | Target |
|---|---|---|---|---|
| 1 | Hook | 0:30 | 0:40 | 0:45 |
| 2 | Shape → function | 1:20 | 1:28 | 1:45 |
| 3 | AF2's three ideas | 1:07 | 1:43 | 2:15 |
| 4 | Cost + bitter lesson | 1:23 | 1:35 | 1:00 |
| 5 | Text-to-image | 1:28 | 1:18 | 1:15 |
| 6 | Flow matching | **1:16** | 1:46 | **2:30** |
| 7 | Architecture | **3:23** | 3:00 | **1:45** |
| 8 | Block | 2:09 | 2:20 | 1:15 |
| 9 | Training | 1:29 | 1:48 | 1:30 |
| 10 | Swaps recap | 0:51 | 0:53 | 0:30 |
| 11 | Accuracy | 1:04 | 1:00 | 1:15 |
| 12 | Gains | 1:09 | 1:10 | 1:00 |
| 13 | Takeaway | 0:34 | 0:26 | 0:30 |

The total is in range, but the balance is upside down. The two 30% items are short: the problem (slide 3) and the solution (slide 6). The architecture slide alone is 3:23, nearly 3x the flow-matching time.

## Fixed since run 1

- adaLN is now correctly the DiT part, and you explained the teal timestep path.
- The training vs sampling difference is stated clearly.
- Pair representation now has a clean one-liner.
- "One velocity field with 920 vectors" is correct.
- Results slides: the numbers are right, and the 100M = 66 GFLOPs at AF2's size point is good.
- "right?" fell from 19 to 5.

## Still wrong

1. **Slide 9, again:** "to select samples they use a loss term… only took samples with LDDT > 85… scaling the LDDT weight makes them more harsh on which samples are chosen."
   - Selection uses **pLDDT**, the source model's own confidence: > 85 for SwissProt, > 80 for AFESM-E.
   - LDDT is a **training loss**. Raising its weight near t = 1 punishes the model's bad local geometry. It has nothing to do with choosing samples.
   - This is the second run with the same mix-up, so the slide layout is probably inviting it (data and loss sit side by side).
2. **Slide 7, order of operations:** you said ESM2 embeddings are concatenated with the tokens *coming out of* the trunk. They are concatenated with the grouped residue tokens and fed *into* the trunk (paper §2.3; the arrow on the slide goes into the trunk).
3. **Slide 7, skip connection:** the vanishing-gradient detour is back (35 s). It also has an error: gradients vanish through *depth* (many layers multiplied together), not "as training goes on".
4. **Slide 8:** SwiGLU is still "a smoother activation so training is more stable". It's a gated feed-forward layer: one branch multiplies the other. RoPE trailed off at "added layers are four axes"; finish the sentence: 3 axes for the amino acid's reference 3D shape, 1 for the residue index.
5. **Slide 6:** the loss explanation was vague ("V0 is kind of the velocity field term"). The needed sentence: "the network sees only the noisy structure, t and the sequence, and is graded by squared error against x minus ε."
6. **Slide 11:** "the 100M model performs close to the 3B model" is true only on CAMEO22 (0.80 vs 0.84). On CASP14 it's 0.61 vs 0.72, a big gap, and that gap is the scaling story.
7. **Slide 13:** "can surpass and perform better than architectures that hard-code knowledge" contradicts your own results slide. Say "gets close to, at a fraction of the compute".
8. **Opening:** "pulled directly from the original attention paper" isn't right; the title isn't from "Attention Is All You Need". Drop the line.
9. **Slide 3:** the MSA explanation lost its key idea. Say "positions that mutate together are probably touching (co-evolution)". It's one sentence, and it's what makes MSA make sense.
10. **Slide 10:** "28 blocks vs AF2's 48" is the 700M model; the 3B has 36. Say "28 in the 700M model", or skip the number.

## Delivery

- **Pace:** 142 words/min, up from 129. Fine, but you sped up on the hard slides.
- **"so":** 115 times, unchanged.
- **"kind of":** 17 times, up from 13.
- **Dead air:** 13.5 s at 11:18, in the middle of adaLN. Have the sentence ready: "a small MLP turns t into a scale, shift and gate for each half of the block".
- **MNIST:** still about 25 s on slide 4.

## To rebalance (moves about 1:45)

- Slide 7: -1:30. Drop the skip-connection lecture and the "we went from atoms to residues…" recap.
- Slide 8: -0:45.
- Slide 4: -0:20. Drop MNIST.
- Slide 6: +1:00. Explain the target and the loss.
- Slide 3: +0:30. Add co-evolution.
