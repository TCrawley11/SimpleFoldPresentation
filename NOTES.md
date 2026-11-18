# SimpleFold presentation - working notes

Paper: SimpleFold: Folding Proteins is Simpler than You Think (Wang et al., Apple). arXiv 2509.18480 (v1 Sep 2025, v4 Dec 9 2025).
Course: computational biology paper presentation, 15-20 min.
Rubric: problem definition 30%, solution idea (memorable) 30%, slide clarity 10%, interesting 10% (remaining 20% unknown).

## Decisions (agreed with Tygo)

- Format: reveal.js HTML deck, minimal style, light theme, speaker notes per slide.
- Presenting on own laptop (Intel Mac), wifi available. Vendor libs locally anyway.
- Interactivity is restrained: this is a paper talk, not a demo. "A little personality" over PowerPoint.
  - KEEP interactive: folding animation (hook + reprise at end), 2D flow-matching toy (t slider).
  - Architecture: step-through builds (reveal fragments), not a widget.
  - STATIC: AF2 cost (N^2 / N^3), "instead of X -> Y" cards (no flip), results bars, ensemble, compute.
  - DROPPED: audience vote.
- Folding animation: use a real SimpleFold sample (Apple's released predictions), do not run the model.
  Animate along the flow-matching straight path x_t = t*x + (1-t)*eps from Gaussian noise to the sample.
  Label honestly: real SimpleFold-3B output; path shown is the linear interpolant the model is trained on
  (actual sampling uses an Euler-Maruyama SDE, Eq. 2.5, so the real trajectory is not exactly straight).
  Model works in coords scaled by 1/16, so noise std ~16 A in real units.

## Slide plan (~18 min, 12 slides)

1. Hook - noise cloud folds into a protein. "What if AlphaFold's cleverest parts weren't necessary?"
2. Problem: sequence -> shape -> function
3. How AF2 solved it: MSA, pair representation, triangle updates (one sentence + one picture each)
4. Cost + the question: N^2 pair grid, N^3 triangle updates; bitter-lesson line
5. Reframe (the sticky idea): text-to-image vs sequence-to-structure
6. Flow matching: 2D toy, slide t, velocity x - eps
7. Architecture: atom encoder -> group -> residue trunk (+ frozen ESM2-3B) -> ungroup + skip -> atom decoder -> velocity
8. What replaces the removed parts: PLM for MSA, SO(3) augmentation for equivariance, data + scale
9. Accuracy: CAMEO22 + CASP14 bars
10. What you gain: ensembles + compute
11. Critical take
12. Takeaway: reprise hook animation

## Corrections to Tygo's Notion notes

- "Adaptive layers" = adaLN from DiT (Peebles & Xie 2023): timestep t produces scale/shift inside each block. Not adaptive depth/width transformers.
- eps is pure Gaussian noise N(0, I); x_t is the noisy structure.
- The E in L_FM is an expectation.

## Verified facts (from arXiv v4 HTML, data/raw/paper.txt)

- Removed: MSA, pair representations, triangle updates, equivariant modules. Uses frozen ESM2-3B embeddings; SO(3) rotation augmentation.
- Loss: L = L_FM + alpha(t) L_LDDT. Pretrain alpha=1; finetune alpha(t) = 1 + 8 ReLU(t - 0.5) (max 5). LDDT computed on one-step Euler estimate x_hat = x_t + (1-t) v.
- Timestep sampling p(t) = 0.98 LN(0.8, 1.7) + 0.02 U(0,1), skewed toward clean data (t=1).
- Sizes: 100M, 360M, 700M, 1.1B, 1.6B, 3B. Training data: ~160K PDB + ~270K SwissProt (AFDB) + ~1.9M AFESM (~2M total); 3B uses AFESM-E, 8.6M distilled.
- CAMEO22 TM-score (mean): AF2 0.863, RoseTTAFold2 0.864, ESMFold 0.853, SimpleFold-3B 0.837, SimpleFold-100M 0.803.
- CASP14 TM-score (mean): AF2 0.845, RoseTTAFold2 0.802, ESMFold 0.701, SimpleFold-3B 0.720, SimpleFold-100M 0.611.
- Forward Gflops (Tab. 5): AF2 95M params 30,935; ESMFold 710M 3,399.7; SimpleFold-100M 66.5; SimpleFold-3B (2.86B) 1,382.4.
- Inference on one H100, length 1024 (Tab. 7): AF2 111.5 s; ESMFold 43.6 s; SimpleFold-100M 5.6 s; SimpleFold-3B 44.6 s (200 steps).
- Self-distillation ablation (Tab. 10, 700M, CASP14 TM): AFDB/AFESM data 0.680; PDB only 0.606; self-distilled R2 0.649.
- Failure mode (Sec. 11.3): secondary structure mostly right, relative domain placement wrong; also seen in ESMFold, attributed to shared ESM2 embeddings.
- Ensembles: SOTA on Apo/holo two-state benchmark; comparable/better than ESMFlow on Fold-switch. tau=0.8 for multi-state, 0.01 for folding.
- Scaling: authors say scaling of data + model size "not yet rigorously investigated in protein folding"; bigger models help more on CASP14.

## Data sources

- Apple released SimpleFold predictions: https://ml-site.cdn-apple.com/models/simplefold/{cameo22,casp14,apo,codnas}_predictions.zip
  Downloaded cameo22 + codnas into data/raw/ (gitignored). Extracted simplefold_3B only.
  Note: B-factor column in these files is 100.0 placeholder, not pLDDT.
- data/raw/paper_fig1.png - paper Fig. 1 from the repo (examples, scaling bubble chart, M2 Max inference times).
- Paper figures on arXiv HTML: new_arch.png (architecture), group.png, simplefold_vs_alphafold.png, figures/failure.png, figures/additional_ensemble.png.
- data/analyze.py: loads predictions (gemmi + numpy), lists CAMEO22 targets and codnas sample spread (pairwise CA RMSD across 5 samples).

## Build status (deck v2)

- Deck: index.html, 13 slides (~17:15; critical-take slide removed, its points moved to "Likely questions" in Notion). Slide 6 right column now shows 4 steps: path, target velocity, full L_FM (expectation, 1/N_a), ODE. v2 changes: no reveal speaker notes (notes plugin removed);
  architecture slide cleaned (only the DiT note below, "Not in here" box top right, group/ungroup blue);
  new slide 8 "Every part of the block is borrowed" (block diagram: adaLN-Zero, QK-norm, SwiGLU, RoPE);
  new slide 9 training (data mix bars, L = L_FM + alpha(t) L_LDDT, pretrain/finetune table).
- Speaker notes: the Notion page is the ONLY source of truth (Tygo edits it in his own voice; slides 1-6 already rewritten by him).
  https://app.notion.com/p/SimpleFold-Speaker-Notes-41c2f184ccb48145bd40e2badabce554 (personal account).
  Always read it first and make targeted update_content edits; never replace_content. Local speaker-notes.md was removed to avoid drift.
  Slide 6 notes rewritten around the process (linear interpolant, target velocity, L_FM term by term, ODE integration t: 0 -> 1).
- Block facts verified in code: apple/ml-simplefold src/simplefold/model/torch/blocks.py DiTBlock = adaLN-Zero
  (6 modulation vectors, zero-init), attention q/k RMSNorm (QK-norm), SwiGLUFeedForward. Trunk depth 8-36 blocks (Table 5).
- Protein used everywhere: wallaby transthyretin, CAMEO22 target 7RLK chain D, 117 residues / 920 heavy atoms.
  SimpleFold-3B prediction vs experimental: CA RMSD 0.45 A, TM ~0.99 (my calc, data/export_ttr.py). Easy target; say so.
- Ensemble visual uses paper Fig. 1(c) (6NDW, MD-finetuned model).
- Baselines in Table 1 were rerun by the authors (ColabFold for AF2/RF/ESMFold, AF2 without templates).
- Verified with tools/shoot.py (all slides) and tools/shoot_one.py N out.png 2 (one slide at 2x for detail crops), headless Chromium, no console errors. Block diagram (slide 8) redrawn on a uniform grid. Not yet checked on Tygo's Intel Mac / projector.

## Rehearsals

- rehearsal/runN.m4a (gitignored) -> `python3 tools/transcribe.py rehearsal/runN.m4a` (faster-whisper small.en, ~12 min CPU)
  -> runN_transcript.txt/json -> runN_review.md (per-slide timing vs Notion targets, technical errors, fillers, pauses).
- Run 1: 19:42. Run 2: 17:43; time skewed to slides 7-8, slides 3 and 6 short; repeated pLDDT/LDDT mix-up on slide 9.
- After run 2: slide 9 relabelled ("1 · Pick the data, filter: pLDDT" / "2 · Train the model, loss: FM + LDDT");
  slide 7 build order now group -> ESM2 + trunk -> ungroup/decoder (sequence joins before the trunk); Notion notes match.

## Repo

- GitHub: TCrawley11/SimpleFoldPresentation (main). This folder is a clone; Tygo pushes from the host if the sandbox token is refused.

## Next steps

1. Rehearse again; target slide 6 ~2:30 and slide 7 ~1:45.
2. If over time: trim slide 10 (swaps recap) first.
