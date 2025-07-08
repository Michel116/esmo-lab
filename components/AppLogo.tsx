import Image from 'next/image';

export function AppLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const dimensions = {
    sm: { width: 50, height: 50 },
    md: { width: 90, height: 90 },
    lg: { width: 120, height: 120 },
    xl: { width: 150, height: 150 },
  };

  const selectedDimensions = dimensions[size] || dimensions['md'];

  return (
    <Image
      src="/Logo.png"
      alt="ЭСМО Калибровка"
      width={selectedDimensions.width}
      height={selectedDimensions.height}
      className="mix-blend-multiply"
      priority 
    />
  );
}
