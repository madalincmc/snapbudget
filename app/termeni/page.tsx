import type { Metadata } from 'next';
import Link from 'next/link';
import { ContactLink, LegalList, LegalPage, LegalSection } from '@/components/legal-page';
import { OPERATOR_NAME } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Termeni de utilizare — SnapBudget',
};

const linkClass = 'text-foreground font-medium underline underline-offset-2';

export default function TermsPage() {
  return (
    <LegalPage title="Termeni de utilizare">
      <LegalSection title="1. Ce este SnapBudget">
        <p>
          SnapBudget este o aplicație gratuită pentru evidența cheltuielilor personale și ale
          gospodăriei, dezvoltată și oferită de {OPERATOR_NAME}, persoană fizică („noi”). Este un
          proiect personal, pus la dispoziția oricui îl găsește util, nu un serviciu comercial.
        </p>
        <p>
          Prin crearea unui cont sau folosirea aplicației accepți acești termeni și{' '}
          <Link href="/confidentialitate" className={linkClass}>
            Politica de confidențialitate
          </Link>
          . Dacă nu ești de acord, te rugăm să nu folosești aplicația.
        </p>
      </LegalSection>

      <LegalSection title="2. Contul tău">
        <LegalList>
          <li>Te conectezi cu un cont Google și răspunzi de activitatea din contul tău.</li>
          <li>Trebuie să ai cel puțin 16 ani.</li>
          <li>
            Dacă te alături unei gospodării, cheltuielile tale sunt vizibile celorlalți membri.
            Invită doar persoane în care ai încredere.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="3. Cum poți folosi aplicația">
        <p>SnapBudget este destinat uzului personal și necomercial. Nu ai voie:</p>
        <LegalList>
          <li>să încarci conținut ilegal sau care aparține altcuiva fără acordul acestuia;</li>
          <li>
            să încerci să accesezi datele altor utilizatori, să ocolești măsurile de securitate sau
            să suprasoliciți serviciul;
          </li>
          <li>să folosești aplicația în mod automatizat sau pentru a revinde serviciul.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="4. Datele tale rămân ale tale">
        <p>
          Bonurile, cheltuielile și celelalte date pe care le adaugi îți aparțin. Ne acorzi doar
          dreptul limitat de a le stoca și prelucra cât este necesar pentru a-ți oferi aplicația.
          Cum le prelucrăm este descris în Politica de confidențialitate.
        </p>
      </LegalSection>

      <LegalSection title="5. Fără garanții">
        <p>
          Aplicația este oferită gratuit, <strong className="text-foreground">„ca atare”</strong> și
          „în funcție de disponibilitate”, fără garanții de niciun fel, exprese sau implicite, în
          măsura permisă de lege. În special:
        </p>
        <LegalList>
          <li>
            Citirea automată a bonurilor și încadrarea în categorii pot greși. Verifică întotdeauna
            suma, data și magazinul.
          </li>
          <li>
            Totalurile, bugetele, analizele și sfaturile din aplicație au rol informativ. Nu sunt
            consultanță financiară, fiscală sau contabilă.
          </li>
          <li>
            SnapBudget nu este un sistem de arhivare a documentelor. Păstrează bonurile și facturile
            originale de care ai nevoie pentru garanții, retururi sau obligații fiscale.
          </li>
          <li>
            Nu garantăm că aplicația va funcționa neîntrerupt, fără erori sau că datele nu se vor
            pierde.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="6. Limitarea răspunderii">
        <p>
          În măsura maximă permisă de lege, nu răspundem pentru daune indirecte sau pe cale de
          consecință, pierderi financiare, pierderi de date sau decizii luate pe baza informațiilor
          din aplicație.
        </p>
        <p>
          Nimic din acești termeni nu limitează răspunderea care nu poate fi limitată potrivit
          legii, inclusiv pentru prejudiciile cauzate cu intenție sau din culpă gravă, și nici
          drepturile pe care le ai ca utilizator sau consumator în temeiul legislației aplicabile,
          inclusiv al GDPR.
        </p>
      </LegalSection>

      <LegalSection title="7. Modificarea sau oprirea serviciului">
        <p>
          Putem modifica, suspenda sau opri aplicația oricând. Dacă o oprim definitiv, vom încerca
          să anunțăm cu cel puțin 30 de zile înainte, timp în care îți putem trimite, la cerere,
          datele tale.
        </p>
        <p>
          Putem suspenda sau închide conturile care încalcă acești termeni. Tu poți renunța oricând
          la aplicație și poți cere ștergerea contului scriindu-ne.
        </p>
      </LegalSection>

      <LegalSection title="8. Modificarea termenilor">
        <p>
          Putem actualiza acești termeni. Versiunea curentă este întotdeauna pe această pagină, cu
          data ultimei actualizări. Schimbările importante le anunțăm în aplicație, iar folosirea ei
          în continuare înseamnă acceptarea noii versiuni.
        </p>
      </LegalSection>

      <LegalSection title="9. Legea aplicabilă">
        <p>
          Acești termeni sunt guvernați de legea română. Eventualele dispute se soluționează pe cale
          amiabilă, iar în lipsa unei înțelegeri, de instanțele competente din România, fără a-ți
          restrânge drepturile pe care ți le acordă legislația privind protecția consumatorilor.
        </p>
      </LegalSection>

      <LegalSection title="10. Contact">
        <p>
          Pentru orice întrebare despre acești termeni, scrie-ne la <ContactLink />.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
