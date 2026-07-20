# Guider

시연영상 촬영용 Chrome 확장 프로그램. 페이지 우측에 채팅 패널을 띄우고,
질문을 입력하면 **클릭해야 할 위치를 하이라이트**로 안내한다.

> ⚠️ 실제 AI 추론은 하지 않는다. 키워드 매칭 기반의 **시나리오 연출**이다.

## 설치 (개발자 모드)

1. Chrome 주소창에 `chrome://extensions` 입력
2. 우측 상단 **개발자 모드** 켜기
3. **압축해제된 확장 프로그램을 로드** 클릭
4. `c:\Project\Guider` 폴더 선택

## 사용법

- 툴바의 Guider 아이콘 클릭 → 패널 열기/닫기
- 페이지 우측 하단의 원형 버튼(FAB) 클릭으로도 열 수 있음
- `ESC` 로 닫기
- 패널이 열리면 페이지 본문이 **가려지지 않고 패널 폭(380px)만큼 좁아지며 왼쪽으로 밀린다**
- 질문 입력 → 약 1.1초 후 답변 + 대상 요소에 핑크 링 + "여기를 클릭하세요" 말풍선

## 파일 구조

| 파일 | 역할 |
|---|---|
| `manifest.json` | MV3 매니페스트 |
| `background.js` | 툴바 아이콘 클릭 → 패널 토글 메시지 전송 |
| `content.js` | 패널 UI 생성, 시나리오 응답, 하이라이트 렌더링 |
| `content.css` | 패널 · 말풍선 · 하이라이트 스타일 |
| `icons/logo.png` | 브랜드 로고 원본 (734×883). 패널 내부에서 사용 |
| `icons/icon{16,48,128}.png` | 툴바/확장 목록 아이콘. `logo.png` 에서 생성 |

## 시연 시나리오 수정

[content.js](content.js) 상단의 `SCENARIOS` 배열을 편집한다.

```js
{
  keywords: ["로그인", "login"],       // 질문에 포함되면 매칭
  answer: "...",                       // 챗봇 답변 (\n 줄바꿈)
  label: "여기를 클릭하세요",           // 하이라이트 말풍선 문구
  selectors: ['a[href*="login"]'],     // 위에서부터 순서대로 탐색, 첫 매칭 요소 사용
}
```

매칭되는 시나리오가 없으면 `FALLBACK` 이 사용된다.
촬영 대상 사이트(예: `www2.sejong.go.kr/bigdata`)의 실제 DOM 구조에 맞춰
`selectors` 를 정확한 값으로 바꾸면 하이라이트 위치가 정확해진다.

수정 후 `chrome://extensions` 에서 **새로고침** → 대상 페이지 새로고침.

## 로고 교체

`icons/logo.png` 를 새 파일로 덮어쓴 뒤, 아래 PowerShell 로 툴바 아이콘 3종을 재생성한다.

```powershell
Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Image]::FromFile("c:\Project\Guider\icons\logo.png")
foreach ($s in 16,48,128) {
  $bmp = New-Object System.Drawing.Bitmap($s, $s)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = 'HighQualityBicubic'; $g.SmoothingMode = 'AntiAlias'
  $g.Clear([System.Drawing.Color]::Transparent)
  $scale = [Math]::Min($s / $src.Width, $s / $src.Height)
  $w = $src.Width * $scale; $h = $src.Height * $scale
  $g.DrawImage($src, [float](($s-$w)/2), [float](($s-$h)/2), [float]$w, [float]$h)
  $g.Dispose(); $bmp.Save("c:\Project\Guider\icons\icon$s.png", 'Png'); $bmp.Dispose()
}
$src.Dispose()
```
