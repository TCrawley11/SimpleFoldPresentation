# SimpleFold: Speaker Notes

Target length: about 18 minutes. Times are cumulative after each slide. [→] means press the right arrow.

## 1. Hook: SimpleFold (0:45, total 0:45)
- Open on the noise cloud and don't explain it yet. "These are 920 random points. By the end of the talk you'll know what happens when I press this."
- [→] The question appears and the cloud folds into a protein: transthyretin, as SimpleFold predicted it from its sequence alone.
- "AlphaFold2 won a Nobel Prize using very clever machinery built specifically for biology. This paper asks how much of that machinery you actually need."
- If asked: the end point is SimpleFold's own released prediction. The path drawn is the straight training path, not the sampler's exact trajectory.

## 2. Problem: a string of letters decides a 3D shape (1:45, total 2:30)
- A protein is a chain of amino acids. There are 20 kinds, each written as a letter, and this one has 117.
- The chain folds by itself into one specific 3D shape, and that shape is what does the work.
- Transthyretin carries thyroid hormone in the blood. When it misfolds it clumps into amyloid fibrils, which causes heart and nerve disease. The drug tafamidis works by holding the folded shape together. So shape = function = medicine.
- Measuring a structure experimentally takes months, but reading a sequence is cheap. That leaves far more known sequences than known structures, which is why we want a model: sequence in, 3D coordinates out.
- This prediction is within half an angstrom of the experimental structure (my calculation: CA RMSD 0.45 Å). Admit that it's an easy target, because transthyretin is very well studied.

## 3. Problem: AlphaFold2 hard-codes three ideas (2:15, total 4:45)
- Go slow here. If the audience doesn't understand what gets removed, the solution won't land.
- **MSA:** look up the same protein in many species. If position 5 changes whenever position 14 changes, the two are probably touching (co-evolution). This needs an expensive database search for every protein.
- **Pair representation:** besides one vector per residue, AlphaFold2 keeps one vector for every PAIR of residues. The middle map shows what that table tries to capture: which residues are close in 3D. It's the real distance map of our protein.
- **Triangle updates:** to update pair (i, j), look at every third residue k. If i is near k and k is near j, then i can't be far from j. The triangle inequality is built into the architecture.
- All three are our biological knowledge, hard-coded into the network.

## 4. Problem: expensive, and other fields dropped theirs (1:00, total 5:45)
- The pair table grows with N², and triangle updates grow with N³. A 1,000-residue protein means a billion triangle terms per update, in each of 48 blocks.
- Vision and language used to rely on hand-designed features as well. General transformers trained on a lot of data won (Sutton's "bitter lesson").
- [→] The paper's question: is folding special, or is it the same story?

## 5. Idea: treat folding like text-to-image (1:30, total 7:15)
- This is the one idea to remember. Say it twice.
- Text-to-image starts from noise and gradually turns it into a picture that matches the prompt.
- In SimpleFold the amino-acid sequence is the prompt. The output isn't pixels, it's x, y, z coordinates for every atom.
- Both rows use the same equation: a blend of noise and data, with t going from 0 to 1.
- There's no MSA, no pair table and no triangles, just "generate a structure conditioned on a sequence" with the kind of transformer used for images.

## 6. Idea: flow matching, the interactive toy (2:00, total 9:15)
- Do two passes and no more.
- **Training (default):** grey is noise and teal is real data. Each line pairs one noise sample with one real structure. Drag t: the black dot is the blend x_t, and the red arrow is the target x - ε, which stays constant along the line. The network sees x_t, t and the sequence, and learns to output that arrow. It's basically regression (step 2).
- **[Sampling, Play]:** at inference there is no x. Start from fresh noise and follow the predicted arrows step by step. The paths bend and split, some landing on shape A and some on shape B. Different noise gives a different valid structure, which is where ensembles come from.
- In SimpleFold one point is a whole protein (920 atoms × 3 numbers), and the arrows depend on the sequence.
- If asked: the toy uses the exact ideal arrows for this small 2D dataset, not a trained network. The real sampler is a stochastic version (Euler-Maruyama) with 200 to 500 steps.

## 7. Method: a plain transformer sandwich (1:45, total 11:00)
- Build the diagram left to right.
- The input is the noisy atom cloud x_t, 920 atoms × 3. The atom encoder is a small transformer, and each atom only attends to atoms in nearby residues.
- [→] **Group** (blue): average all the atoms of a residue into one token, so 920 tokens become 117. The residue trunk works at this coarse level and holds almost all the parameters and compute. Fine → coarse → fine, like a U-Net.
- [→] The sequence comes in through ESM2, a frozen protein language model (think BERT for proteins). Its per-residue embeddings are concatenated onto the residue tokens. This is the "text encoder" of text-to-image.
- [→] **Ungroup** (blue): copy each residue token back to its atoms. The skip connection from the encoder lets the decoder tell atoms of the same residue apart. The atom decoder outputs one 3D arrow per atom: the velocity.
- Point to the top-right box: none of AlphaFold2's machinery is in here.
- Every box is the same block, which is the next slide.

## 8. Method: every part of the block is borrowed (1:15, total 12:15)
- One block reads left to right: normalize, attention, add back; normalize, feed-forward, add back. It's a standard pre-norm transformer.
- The timestep t (teal line) is turned into 6 vectors that scale, shift and gate each half of the block. Each piece comes from another field:
  - **adaLN-Zero** comes from DiT, an image diffusion transformer. The gates start at zero, so a fresh block is the identity, which keeps training of deep stacks stable. ("Adaptive layers" in the paper means exactly this, not adaptive depth or width.)
  - **QK-norm** comes from ViT-22B and Stable Diffusion 3. Normalizing queries and keys stops attention logits from exploding as models get big.
  - **SwiGLU** is the gated feed-forward layer used in PaLM and LLaMA.
  - **RoPE** is the rotary position encoding used by most LLMs. The trunk uses the residue index. Atom layers use 4 axes: a 3D reference shape of the amino acid (computed by a simple chemistry rule, not learned) plus the residue index.
- Message: nothing here was invented for proteins. They took the best current parts from image and language models.

## 9. Method: training (1:30, total 13:45)
- **Data, left:** only 160K real experimental structures exist in the PDB (up to May 2020). The rest are predictions by AlphaFold2 and ESMFold, kept only where those models were confident. That's about 2M structures for most model sizes and about 9M for the 3B model.
- **Loss, right:** the flow-matching term from slide 6 plus one structural term. LDDT checks that distances between nearby atoms are right, and it's computed on a one-step guess of the clean structure.
- **Two stages:** pretrain on everything with proteins cropped to 256 residues. Then finetune on the high-quality sets only, up to 512 residues, with the LDDT weight rising from 1 to 5 as t approaches 1 (near the clean structure).
- More tricks borrowed from image diffusion:
  - Timesteps are sampled mostly near clean data (a logit-normal distribution, as in Stable Diffusion 3, but shifted toward t = 1) to learn fine side-chain detail.
  - Structures are randomly rotated.
  - EMA (exponential moving average) weights.
- Afterward, a small confidence head (pLDDT) is trained with the folding model frozen.

## 10. Method: each AlphaFold2 part gets a generic substitute (0:45, total 14:30)
- This is a quick recap of what replaced each piece:
  - MSA → protein language model.
  - Pair table and triangles → plain attention.
  - Equivariant layers → random rotations.
  - Many protein-specific losses → one generative loss.
- The figure shows one AlphaFold2 Evoformer block (top) next to one SimpleFold block (bottom). That's the whole difference in one picture.

## 11. Results: close to AlphaFold2, not better (1:15, total 15:45)
- TM-score runs from 0 to 1 and measures how well the overall fold matches. Above about 0.5 means the fold is right.
- On CAMEO22 (typical difficulty), SimpleFold-3B gets about 97% of AlphaFold2's score, and even the 100M model is respectable.
- On CASP14 (the hard set) there's a real gap to AlphaFold2: 0.72 vs 0.85. But it beats ESMFold, the fair comparison, which also uses no MSA and the same ESM2.
- Bigger models help much more on the hard set.
- The authors reran the baselines themselves, mostly through ColabFold.
- The claim isn't "better than AlphaFold". It's "nearly as good, with none of the special parts".

## 12. Results: what you gain (1:00, total 16:45)
- **Ensembles:** because the model is generative, sampling several times gives different conformations, like the toy. Real proteins flex, and many have two states. AlphaFold2 is trained to give one answer. SimpleFold had the best reported result on the apo/holo two-state benchmark.
- **Compute:** AlphaFold2 has 95M parameters but needs about 31 TFLOPs per forward pass because of the pair table and triangles. SimpleFold-3B has 30× the parameters and needs about 22× fewer FLOPs per pass.
- Caveat: sampling runs that pass hundreds of times. On wall-clock time at length 1024 on one H100, the 3B model is still faster (44.6 s vs 111.5 s), and the 100M model takes 5.6 s.
- It runs on a laptop.

## 13. Discussion: simpler, with asterisks (1:00, total 17:45)
1. The biology moved; it didn't disappear. ESM2 already absorbed evolutionary information from sequences, and most training structures are predictions from AlphaFold2 and ESMFold, which do use MSAs.
2. It isn't just copying AlphaFold. The authors trained on real structures, then on SimpleFold's own predictions, for two rounds. CASP14 TM went from 0.606 (PDB only) to 0.649 (self-distilled), against 0.680 with AlphaFold data. So AlphaFold data helps, but it isn't required.
3. Failures get the local helices and sheets right but place whole domains wrong. Long-range geometry is exactly what pair tables and triangles target. ESMFold fails the same way, and the authors blame the shared ESM2 embeddings.
- Also: it handles single chains only, not complexes.

## 14. Takeaway (0:30, total 18:15)
- The animation replays by itself; click it to replay again.
- "Now you know what this is: noise, a transformer that predicts which way each atom should move, and a sequence telling it which protein to make."
- One sentence: folding turned out to be a lot like text-to-image.

### Likely questions
- **Why not equivariant?** Augmentation is cheaper, and with enough data the model learns the symmetry.
- **Complexes or ligands?** Not in this paper; it handles single chains only.
- **Without AlphaFold data?** It still works, somewhat worse (self-distillation ablation, Table 10).
- **How many steps?** 200 to 500 sampler steps. τ controls diversity: 0.01 for single structures, 0.8 for ensembles.
- **What does "adaptive layers" mean?** adaLN from DiT: the timestep sets scale, shift and gate inside each block.
