import gemmi, numpy as np, glob, os, collections
def load(p):
    st=gemmi.read_structure(p); ch=st[0][0]
    ca=[];b=[];seq=[];nat=0
    for r in ch:
        seq.append(gemmi.find_tabulated_residue(r.name).one_letter_code.upper() if gemmi.find_tabulated_residue(r.name) else 'X')
        for a in r:
            nat+=1
            if a.name=='CA': ca.append(a.pos.tolist()); b.append(a.b_iso)
    return np.array(ca),np.array(b),''.join(seq),nat
def kabsch_rmsd(P,Q):
    P=P-P.mean(0);Q=Q-Q.mean(0);H=P.T@Q;U,S,Vt=np.linalg.svd(H);d=np.sign(np.linalg.det(Vt.T@U.T))
    D=np.diag([1,1,d]);R=Vt.T@D@U.T;return np.sqrt(((P@R.T-Q)**2).sum(1).mean())
rows=[]
for p in sorted(glob.glob('cameo22_predictions/simplefold_3B/*.cif')):
    ca,b,seq,nat=load(p); rows.append((os.path.basename(p)[:6],len(ca),nat,b.mean()))
print('cameo: n, atoms, mean b');
for r in sorted(rows,key=lambda r:-r[3])[:40]:
    if r[1]<=220: print(r)
print('codnas')
g=collections.defaultdict(list)
for p in sorted(glob.glob('codnas_predictions/simplefold_3B/*.cif')): g[os.path.basename(p)[:6]].append(p)
out=[]
for k,ps in g.items():
    cas=[load(p)[0] for p in ps]; n=len(cas[0])
    rm=[kabsch_rmsd(cas[i],cas[j]) for i in range(len(cas)) for j in range(i+1,len(cas))]
    out.append((k,n,len(ps),round(float(np.mean(rm)),2),round(float(np.max(rm)),2)))
for o in sorted(out,key=lambda o:-o[3]): print(o)
