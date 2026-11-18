import gemmi, numpy as np, glob, os, urllib.request
def chain_seq_ca(st, chname=None):
    ch = st[0][0] if chname is None else st[0][chname]
    seq=[];ca=[]
    for r in ch:
        info0=gemmi.find_tabulated_residue(r.name)
        if not (info0 and info0.is_amino_acid()): continue
        info=gemmi.find_tabulated_residue(r.name)
        seq.append(info.one_letter_code.upper() if info else 'X')
        a=r.find_atom('CA','*'); ca.append(a.pos.tolist() if a else None)
    return ''.join(seq),ca
def tm(P,Q):
    L=len(Q); d0=max(0.5,1.24*(L-15)**(1/3)-1.8)
    # iterative Kabsch on close pairs (rough TM-align-lite on fixed correspondence)
    best=0; idx=np.arange(L)
    for it in range(6):
        Pc=P[idx].mean(0);Qc=Q[idx].mean(0);H=(P[idx]-Pc).T@(Q[idx]-Qc)
        U,S,Vt=np.linalg.svd(H);dd=np.sign(np.linalg.det(Vt.T@U.T));R=Vt.T@np.diag([1,1,dd])@U.T
        Pa=(P-Pc)@R.T+Qc; d=np.linalg.norm(Pa-Q,axis=1)
        s=np.sum(1/(1+(d/d0)**2))/L; best=max(best,s)
        idx=np.where(d<max(d0*2,4))[0]
        if len(idx)<4: break
    return best
res=[]
os.makedirs('raw/gt',exist_ok=True)
for p in sorted(glob.glob('raw/cameo22_predictions/simplefold_3B/*.cif')):
    pid,ch=os.path.basename(p)[:6].split('_')
    pst=gemmi.read_structure(p); pseq,pca=chain_seq_ca(pst)
    if not (60<=len(pseq)<=130): continue
    gp=f'raw/gt/{pid}.cif'
    if not os.path.exists(gp):
        try: urllib.request.urlretrieve(f'https://files.rcsb.org/download/{pid.upper()}.cif',gp)
        except Exception as e: print('fail',pid,e); continue
    gst=gemmi.read_structure(gp); gst.setup_entities()
    try: gseq,gca=chain_seq_ca(gst,ch)
    except Exception:
        # auth chain naming may differ
        names=[c.name for c in gst[0]]; print('chain?',pid,ch,names); continue
    al=gemmi.align_string_sequences(list(gseq),list(pseq),[])
    # map pairs
    P=[];Q=[];i=j=0
    for op,n in [(c,int(x)) for x,c in __import__('re').findall(r'(\d+)([MID])',al.cigar_str())]:
        for _ in range(n):
            if op=='M':
                if gca[i] and pca[j] and gseq[i]==pseq[j]: Q.append(gca[i]);P.append(pca[j])
                i+=1;j+=1
            elif op=='I': i+=1
            else: j+=1
    P=np.array(P);Q=np.array(Q)
    if len(P)<0.8*len(pseq): print('poor map',pid,len(P),len(pseq)); continue
    t=tm(P,Q)
    # secondary structure from gemmi? count helix/sheet via mmCIF struct_conf in GT
    doc=gemmi.cif.read(gp).sole_block()
    nh=len(doc.find_values('_struct_conf.id')); ns=len(doc.find_values('_struct_sheet_range.id'))
    res.append((pid+'_'+ch,len(pseq),round(t,3),nh,ns,doc.find_value('_struct.title')))
for r in sorted(res,key=lambda r:-r[2]): print(r)
