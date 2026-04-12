import HomeClient from '@/components/home/HomeClient';
import { HomeFooter } from '@/components/home/HomeFooter';
import { HomeHeader } from '@/components/home/HomeHeader';

export default function Home() {
  return <HomeClient header={<HomeHeader />} footer={<HomeFooter />} />;
}
