# Query Format Guide

## Format Description dengan Sumber Rujukan

Untuk menambahkan sumber rujukan dalam query, gunakan format berikut:

```
[Pertanyaan singkat]? Source: [Nama Sumber] ([URL])
```

### Contoh:

```
Was Bitcoin (BTC) price above $100,000 USD on January 25, 2026 at 00:00 UTC? Source: CoinMarketCap (https://coinmarketcap.com/currencies/bitcoin/)
```

## Cara Kerja di Dashboard

### 1. Homepage (Query List)
- **Tampilan**: Hanya menampilkan pertanyaan (sebelum "Source:")
- **Contoh**: "Was Bitcoin (BTC) price above $100,000 USD on January 25, 2026 at 00:00 UTC?"

### 2. Query Detail Modal
- **Tampilan**: Memisahkan menjadi 2 section:
  - **Question**: Pertanyaan lengkap
  - **Official Data Source**: Sumber rujukan dengan link yang bisa diklik

## Keuntungan Format Ini

✅ **Dashboard tetap bersih** - Hanya pertanyaan yang terlihat di list
✅ **Detail lengkap di modal** - Sumber rujukan muncul saat query diklik
✅ **Link bisa diklik** - URL otomatis menjadi hyperlink
✅ **Tidak perlu ubah kontrak** - Menggunakan field `description` yang sudah ada
✅ **Konsistensi data** - Semua voters menggunakan sumber yang sama

## Sumber Rujukan yang Direkomendasikan

### Cryptocurrency
- **CoinMarketCap**: https://coinmarketcap.com/
- **CoinGecko**: https://www.coingecko.com/

### Stock Market
- **NASDAQ Official**: https://www.nasdaq.com/market-activity/stocks/
- **NYSE**: https://www.nyse.com/

### Weather
- **Japan Meteorological Agency (JMA)**: https://www.jma.go.jp/
- **NOAA**: https://www.weather.gov/

### Sports
- **Premier League Official**: https://www.premierleague.com/
- **NBA Official**: https://www.nba.com/
- **Australian Open**: https://ausopen.com/

### Forex
- **Bank Indonesia**: https://www.bi.go.id/
- **XE Currency**: https://www.xe.com/

### Commodities
- **Kitco Gold**: https://www.kitco.com/
- **Bloomberg Commodities**: https://www.bloomberg.com/markets/commodities

## Tips

1. **Gunakan sumber resmi** - Pilih website resmi atau yang diakui industri
2. **Spesifik waktu** - Tambahkan waktu spesifik (UTC) untuk data yang berubah-ubah
3. **Pertanyaan jelas** - Buat pertanyaan yang bisa dijawab Yes/No atau pilihan spesifik
4. **Hindari ambiguitas** - Pastikan tidak ada interpretasi ganda
