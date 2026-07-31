# MyMoney

MyMoney on lihtne mobiilisõbralik raha- ja võlahalduse PWA. Eesmärk on, et igapäevane kasutus oleks võimalikult kiire: tänane kulu või tulu saab sisestada mõne vajutusega ning ülejäänud funktsioonid on koondatud loogilistesse menüüdesse.

## Põhimenüü

### Info
Igapäevane rahavaade.

- **Overview** – saldo, tänased tulud, tänased kulud ja turvaliselt kasutatav summa.
- **Quick entry** – kiire Expense / Income sisestus; summa on põhiline väli, kuupäev on vaikimisi tänane.
- **Budget** – kuu tulud, kulud, võlamaksed, algjääk ja turvareserv.
- **Can I buy it?** – sisesta ostu hind ja MyMoney arvutab, kas ost mahub turvalisse eelarvesse.

### Loans
Kõik võlgadega seotud asjad ühes kohas.

- **Cash Out** – raha, mida sina oled teistele võlgu.
- **Cash In** – raha, mida teised sulle võlgnevad.
- Võlgade juures saab jälgida summasid, kuumakseid ja tähtaegu.

### Calendar
Tähtajad ja tegevused.

- **Calendar** – võlgade, nõuete ja ülesannete tähtajad ühes ajajoones.
- **To-Do** – ülesannete lisamine ja tehtuks märkimine.

### Notes
Vabad märkmed raha, kokkulepete ja muu vajaliku info jaoks.

### Halda
Halda jääb seadete ja tööriistade keskuseks.

- README / kasutusjuhend
- Eelarve seaded
- Eelarveprognoos
- Kategooriate piirid
- Planeeritud maksed
- Korduvad kirjed
- Kuude võrdlus
- Kulude jaotus kategooriate kaupa
- Kuude ülevaade
- Otsing ja filtrid
- Kirjete muutmine
- Võta tagasi
- Andmete kontroll
- Varukoopia ja taastamine

## Kiire igapäevane kasutus

1. Ava **Info → Overview**.
2. Vajuta **Expense** või **Income**.
3. Sisesta summa. Nimetus ja kategooria on abistavad, kuid igapäevane sisestus peab jääma kiireks.
4. Vaata samas vaates tänast tulemust ja turvaliselt kasutatavat summat.
5. Võlgade jaoks kasuta **Loans**, ülesannete jaoks **Calendar → To-Do**, märkmete jaoks **Notes**.

## Summade sisestamine

Rahaväljad on mõeldud mobiilis kasutamiseks:

- avaneb numbriklaviatuur;
- sobib nii `12,50` kui `12.50`;
- euro märk kuvatakse välja kõrval;
- olemasolev summa valitakse fookuses võimalusel kohe, et muutmine oleks kiirem.

## Andmed ja varukoopia

MyMoney andmed salvestatakse kasutaja seadmesse. Tee regulaarselt varukoopia menüüst **Halda → Süsteem → Varukoopia**.

Olemasolevad tulud, kulud, võlad ja To-Do kirjed tuleb uuenduste käigus säilitada ning uued vaated kasutavad sama olemasolevat andmestikku.

## PWA

Rakendus on ehitatud Reacti, TypeScripti ja Vite'iga ning seda saab kasutada PWA-na. iPhone'is saab selle lisada avakuvale Safari kaudu **Share → Add to Home Screen**.
