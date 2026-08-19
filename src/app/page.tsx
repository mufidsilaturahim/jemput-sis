import Link from 'next/link'
import styles from './page.module.css'

export default function HomePage() {
  return (
    <main className={styles.directory}>
      <div>
        <h1 className={styles.title}>Jemput SIS</h1>
        <p className={styles.tagline}>Papan panggilan jemputan sekolah</p>
      </div>
      <ul className={styles.gates}>
        <li>
          <Link className={styles.gate} href="/piket">
            Guru Piket
          </Link>
        </li>
        <li>
          <Link className={styles.gate} href="/kelas">
            Guru Kelas
          </Link>
        </li>
        <li>
          <Link className={styles.gate} href="/admin">
            Admin
          </Link>
        </li>
      </ul>
    </main>
  )
}
