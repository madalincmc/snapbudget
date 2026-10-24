import type { Metadata } from 'next';
import { ContactLink, LegalList, LegalPage, LegalSection } from '@/components/legal-page';
import { OPERATOR_NAME } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Politica de confidențialitate — SnapBudget',
};

const linkClass = 'text-foreground font-medium underline underline-offset-2';

export default function PrivacyPage() {
  return (
    <LegalPage title="Politica de confidențialitate">
      <LegalSection title="1. Cine răspunde de datele tale">
        <p>
          Operatorul datelor este {OPERATOR_NAME}, persoană fizică, care dezvoltă și întreține
          SnapBudget ca proiect personal, gratuit. Pentru orice solicitare legată de datele tale ne
          poți scrie la <ContactLink />.
        </p>
      </LegalSection>

      <LegalSection title="2. Ce date colectăm">
        <LegalList>
          <li>
            <strong className="text-foreground">Contul Google</strong>: numele, adresa de e-mail,
            poza de profil și identificatorul contului, primite când te conectezi.
          </li>
          <li>
            <strong className="text-foreground">Bonurile</strong>: fotografiile pe care le încarci
            și datele extrase din ele (magazin, sumă, dată, categorie). Textul complet citit de pe
            bon nu este păstrat, doar aceste câmpuri. Fotografia poate conține și alte informații
            tipărite pe bon, de exemplu ultimele cifre ale cardului.
          </li>
          <li>
            <strong className="text-foreground">Cheltuielile și setările</strong>: cheltuielile
            adăugate manual, notițele, plățile recurente și bugetele.
          </li>
          <li>
            <strong className="text-foreground">Gospodăria</strong>: din ce gospodărie faci parte și
            adresele de e-mail ale persoanelor pe care le inviți.
          </li>
          <li>
            <strong className="text-foreground">Date tehnice</strong>: cookie-urile de sesiune
            necesare conectării, preferințele de afișare salvate în browserul tău și jurnalele
            tehnice ale furnizorilor de găzduire (de exemplu adresa IP și tipul browserului).
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="3. De ce și pe ce temei">
        <LegalList>
          <li>
            Ca să-ți oferim aplicația: contul, citirea bonurilor, evidența cheltuielilor și
            gospodăria comună. Temei: executarea contractului (art. 6 alin. 1 lit. b GDPR), adică
            acești termeni de utilizare.
          </li>
          <li>
            Ca aplicația să fie sigură și să funcționeze corect. Temei: interesul legitim (art. 6
            alin. 1 lit. f GDPR).
          </li>
          <li>
            Ca să trimitem invitația pe care ai cerut-o unei persoane. Temei: interesul legitim de a
            transmite invitația; persoana invitată poate să o ignore, iar invitația expiră.
          </li>
        </LegalList>
        <p>
          Nu vindem datele, nu afișăm reclame, nu facem profilare în scop de marketing și nu folosim
          datele tale pentru a antrena modele de inteligență artificială.
        </p>
      </LegalSection>

      <LegalSection title="4. Cine are acces la ele">
        <LegalList>
          <li>Membrii gospodăriei tale văd cheltuielile pe care le adaugi în gospodărie.</li>
          <li>
            Furnizorii care ne ajută să rulăm aplicația, ca persoane împuternicite: Supabase (bază
            de date, autentificare, stocarea fotografiilor), Vercel (găzduire), Google (conectarea
            și serviciul Cloud Vision, care citește textul de pe bonuri) și Resend (trimiterea
            e-mailurilor de invitație). Aceștia prelucrează datele doar pentru a ne furniza
            serviciile lor.
          </li>
          <li>Autoritățile, doar atunci când legea ne obligă.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="5. Transferuri în afara Uniunii Europene">
        <p>
          Unii dintre acești furnizori prelucrează date și în afara Spațiului Economic European, de
          exemplu în Statele Unite. Transferurile se fac pe baza Cadrului UE-SUA privind protecția
          datelor sau a clauzelor contractuale standard aprobate de Comisia Europeană.
        </p>
      </LegalSection>

      <LegalSection title="6. Cât timp le păstrăm">
        <LegalList>
          <li>Datele contului și cheltuielile, cât timp ai cont.</li>
          <li>Fotografia unui bon este ștearsă odată cu cheltuiala căreia îi aparține.</li>
          <li>
            Când ceri ștergerea contului, ștergem datele în cel mult 30 de zile. Copiile de
            siguranță ale furnizorilor pot păstra date o perioadă limitată, după care sunt
            suprascrise.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="7. Cum le protejăm">
        <p>
          Conexiunile sunt criptate, fotografiile sunt într-un spațiu de stocare privat, iar baza de
          date permite fiecărui utilizator accesul doar la datele lui și ale gospodăriei din care
          face parte. Nicio metodă nu este însă complet sigură. Dacă aflăm despre o încălcare a
          securității care îți afectează datele, te anunțăm conform legii.
        </p>
      </LegalSection>

      <LegalSection title="8. Drepturile tale">
        <p>
          Ai dreptul să ceri accesul la datele tale, corectarea, ștergerea sau restricționarea lor,
          să le primești într-un format portabil și să te opui prelucrării bazate pe interes
          legitim. Scrie-ne la <ContactLink /> și îți răspundem în cel mult 30 de zile.
        </p>
        <p>
          Poți depune și o plângere la Autoritatea Națională de Supraveghere a Prelucrării Datelor
          cu Caracter Personal (ANSPDCP),{' '}
          <a
            href="https://www.dataprotection.ro"
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            dataprotection.ro
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="9. Cookie-uri">
        <p>
          Folosim doar cookie-urile strict necesare pentru a te ține conectat și salvăm local, în
          browser, preferințe precum tema. Nu folosim cookie-uri de analiză sau de publicitate.
        </p>
      </LegalSection>

      <LegalSection title="10. Copii">
        <p>
          SnapBudget nu este destinat persoanelor sub 16 ani și nu colectăm cu bună știință datele
          acestora.
        </p>
      </LegalSection>

      <LegalSection title="11. Modificări">
        <p>
          Putem actualiza această politică. Versiunea curentă este întotdeauna pe această pagină,
          iar schimbările importante le anunțăm în aplicație.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
