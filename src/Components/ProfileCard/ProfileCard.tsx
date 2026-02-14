import styles from "./ProfileCard.module.css"
import ProfileStat from "../ProfileStat/ProfileStat";
import Button from "../Button/Button";
import { Mail } from 'lucide-react';
//finish profile card design
export default function ProfileCard(props: any){
    return(
        <div className={styles.profileWindow}>
            <div className={styles.banner}>
              
            </div>
            <div className={styles.profileInfo}>
                <div className={styles.statsBox}>
                  <ProfileStat
                    stat="Followers"
                    statAmount="5000"
                    outline="1px solid #dbeafe"
                  />
                  <ProfileStat
                    stat="Following"
                    statAmount="50"
                    outline="1px solid #dbeafe"
                  />
                  <ProfileStat
                    stat="Recipes"
                    statAmount="50"
                    outline="1px solid #dbeafe"
                  />
                  <ProfileStat
                    stat="Likes"
                    statAmount="50"
                    outline="1px solid #dbeafe"
                  />
                </div>

                <div className={styles.buttonsContainer}>
                  <div className={styles.followButton}>
                    <Button
                    text="Follow"
                    backgroundColor="linear-gradient(135deg, #ff6a00, #ff2e2e)"
                    textColor="#fff"
                    outline="0px "
                    isActive={true}
                    />  
                  </div>
                  <div className={styles.contactButton}>
                    <Button 
                    backgroundColor="#f3f4f6"
                    textColor="#374151"
                    outline="0px "
                    isActive={true}
                    ><Mail size={18}/> Contact</Button>  
                  </div> 
            </div>
            </div>            
            
        </div>
    );
}